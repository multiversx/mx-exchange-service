import { Inject, Injectable } from '@nestjs/common';
import { HttpsAgent } from 'agentkeepalive';
import AWS, { AWSError, TimestreamQuery } from 'aws-sdk';
import BigNumber from 'bignumber.js';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { HistoricDataModel } from 'src/modules/analytics/models/analytics.model';
import { Logger } from 'winston';
import moment from 'moment';
import { PendingExecutor } from 'src/utils/pending.executor';
import { PromiseResult } from 'aws-sdk/lib/request';
import { QueryResponse } from 'aws-sdk/clients/timestreamquery';
import { MetricsCollector } from 'src/utils/metrics.collector';
import { PerformanceProfiler } from 'src/utils/performance.profiler';
import { ApiConfigService } from 'src/helpers/api.config.service';

@Injectable()
export class AWSTimestreamQueryService {
    private queryExecutor: PendingExecutor<
        {
            params: TimestreamQuery.QueryRequest;
            method: string;
        },
        PromiseResult<QueryResponse, AWSError>
    >;
    private queryClient: TimestreamQuery;
    private readonly DatabaseName: string;

    constructor(
        private readonly apiConfig: ApiConfigService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {
        if (!this.apiConfig.isAWSTimestreamRead()) {
            return;
        }

        AWS.config.update({ region: this.apiConfig.getAWSRegion() });
        const httpsAgent = new HttpsAgent({
            maxSockets: 5000,
        });
        this.queryClient = new TimestreamQuery({
            maxRetries: 10,
            httpOptions: {
                timeout: 60000,
                agent: httpsAgent,
            },
        });
        this.DatabaseName = this.apiConfig.getAWSDatabaseName();

        this.queryExecutor = new PendingExecutor(
            async (value: {
                params: TimestreamQuery.QueryRequest;
                method: string;
            }) => await this.profiledQuery(value.params, value.method),
        );
    }

    private async profiledQuery(
        params: TimestreamQuery.QueryRequest,
        method: string,
    ): Promise<PromiseResult<TimestreamQuery.QueryResponse, AWS.AWSError>> {
        const profiler = new PerformanceProfiler();
        profiler.start();
        const result = await this.queryClient.query(params).promise();
        profiler.stop();
        MetricsCollector.setAWSQueryDuration(method, profiler.duration);

        return result;
    }

    async getAggregatedValue({ table, series, metric, time }): Promise<string> {
        if (!this.apiConfig.isAWSTimestreamRead()) {
            return '0';
        }

        const QueryString = `SELECT sum(measure_value::double) FROM "${this.DatabaseName}"."${table}"
                             WHERE series = '${series}' AND measure_name = '${metric}' AND time between ago(${time}) and now()`;
        const params = { QueryString };
        const { Rows } = await this.queryExecutor.execute({
            params,
            method: this.getAggregatedValue.name,
        });
        const value = Rows[0] ? Rows[0]?.Data[0]?.ScalarValue : '0';
        return new BigNumber(value).toFixed();
    }

    async getLatestCompleteValues({
        table,
        series,
        metric,
    }): Promise<HistoricDataModel[]> {
        if (!this.apiConfig.isAWSTimestreamRead()) {
            return [];
        }

        const QueryString = `
            SELECT date_trunc('day', time) as time, max(value) as value 
            FROM (
              (
                SELECT 
                  time,
                  a.measure_value::double AS value
                FROM "${this.DatabaseName}".${table} a
                INNER JOIN
                  (
                    SELECT max(time) as max 
                    FROM "${this.DatabaseName}".${table} 
                      WHERE series = '${series}'
                      AND measure_name = '${metric}'
                    GROUP BY date(time)
                  ) b
                  on a.time = b.max
                WHERE series = '${series}'
                AND measure_name = '${metric}'   
                GROUP by a.time, a.measure_value::double
                ORDER BY a.time ASC
              )
            ) 
            GROUP BY date_trunc('day', time)
            ORDER BY time ASC
        `;

        const params = { QueryString };
        const { Rows } = await this.queryExecutor.execute({
            params,
            method: this.getLatestCompleteValues.name,
        });
        return Rows.map(
            (Row) =>
                new HistoricDataModel({
                    timestamp: Row.Data[0].ScalarValue,
                    value: new BigNumber(Row.Data[1].ScalarValue).toFixed(),
                }),
        );
    }

    async getSumCompleteValues({
        table,
        series,
        metric,
    }): Promise<HistoricDataModel[]> {
        if (!this.apiConfig.isAWSTimestreamRead()) {
            return [];
        }

        const QueryString = `
            WITH binned_timeseries AS (
                SELECT series, BIN(time, 24h) AS binned_timestamp, SUM(measure_value::double) AS sum
                FROM "${this.DatabaseName}".${table}
                WHERE measure_name = '${metric}'
                    AND series = '${series}'
                GROUP BY series, BIN(time, 24h)
            ), interpolated_timeseries AS (
                SELECT series,
                    INTERPOLATE_LOCF(
                        CREATE_TIME_SERIES(binned_timestamp, sum),
                            SEQUENCE(min(binned_timestamp), max(binned_timestamp), 24h)) AS interpolated_sum
                FROM binned_timeseries
                GROUP BY series
            )
            SELECT time, value
            FROM interpolated_timeseries
            CROSS JOIN UNNEST(interpolated_sum)
      `;
        const params = { QueryString };
        const { Rows } = await this.queryExecutor.execute({
            params,
            method: this.getSumCompleteValues.name,
        });
        return Rows.map(
            (Row) =>
                new HistoricDataModel({
                    timestamp: Row.Data[0].ScalarValue,
                    value: new BigNumber(Row.Data[1].ScalarValue).toFixed(),
                }),
        );
    }

    async getValues24h({
        table,
        series,
        metric,
    }): Promise<HistoricDataModel[]> {
        if (!this.apiConfig.isAWSTimestreamRead()) {
            return [];
        }

        const QueryString = `
            SELECT date_trunc('hour', time) as time, value 
            FROM (
              (
                SELECT 
                time,
                a.measure_value::double AS value
                FROM "${this.DatabaseName}".${table} a
                INNER JOIN
                    (
                        SELECT max(time) as max 
                        FROM "${this.DatabaseName}".${table} 
                        WHERE series = '${series}'
                        AND measure_name = '${metric}'
                        AND time >= ago(24h)
                        GROUP BY date_trunc('hour', time)
                    ) b
                    on a.time = b.max
                WHERE series = '${series}'
                AND measure_name = '${metric}'
                AND time >= ago(24h)   
                GROUP by a.time,  a.measure_value::double
                ORDER BY a.time ASC
              )
            ) 
            GROUP BY date_trunc('hour', time), value
            ORDER BY time ASC
        `;

        const params = { QueryString };
        const { Rows } = await this.queryExecutor.execute({
            params,
            method: this.getValues24h.name,
        });
        return Rows.map(
            (Row) =>
                new HistoricDataModel({
                    timestamp: Row.Data[0].ScalarValue,
                    value: new BigNumber(Row.Data[1].ScalarValue).toFixed(),
                }),
        );
    }

    async getValues24hSum({
        table,
        series,
        metric,
    }): Promise<HistoricDataModel[]> {
        if (!this.apiConfig.isAWSTimestreamRead()) {
            return [];
        }

        const QueryString = `
             WITH binned_timeseries AS (
                SELECT series, BIN(time, 1h) AS binned_timestamp, SUM(measure_value::double) AS sum
                FROM "${this.DatabaseName}".${table}
                WHERE measure_name = '${metric}'
                    AND series = '${series}'
                    AND time > ago(24h)
                GROUP BY series, BIN(time, 1h)
            ), interpolated_timeseries AS (
                SELECT series,
                    INTERPOLATE_LOCF(
                        CREATE_TIME_SERIES(binned_timestamp, sum),
                            SEQUENCE(min(binned_timestamp), max(binned_timestamp), 1h)) AS interpolated_sum
                FROM binned_timeseries
                GROUP BY series
            )
            SELECT time, value AS value
            FROM interpolated_timeseries
            CROSS JOIN UNNEST(interpolated_sum)
        `;

        const params = { QueryString };
        const { Rows } = await this.queryExecutor.execute({
            params,
            method: this.getValues24hSum.name,
        });
        return Rows.map(
            (Row) =>
                new HistoricDataModel({
                    timestamp: Row.Data[0].ScalarValue,
                    value: new BigNumber(Row.Data[1].ScalarValue).toFixed(),
                }),
        );
    }

    async getLatestHistoricData({
        table,
        time,
        series,
        metric,
        start,
    }): Promise<HistoricDataModel[]> {
        if (!this.apiConfig.isAWSTimestreamRead()) {
            return [];
        }

        const formattedStart = moment
            .unix(start)
            .utc()
            .format('yyyy-MM-DD HH:mm:ss');

        const QueryString = `
            WITH max_timeseries AS (
                SELECT max(time) as max_time
                FROM "${this.DatabaseName}".${table}
                WHERE series = '${series}'
                AND measure_name = '${metric}' 
            )
            SELECT time, measure_value::double AS value
                FROM "${this.DatabaseName}".${table} 
                WHERE series = '${series}'
                AND measure_name = '${metric}' 
                AND time >= ((SELECT max_time FROM max_timeseries) - parse_duration('${time}'))
                ${start ? `AND time > '${formattedStart}'` : ''}
                GROUP BY time, measure_value::double
                ORDER BY time ASC
        `;

        const params = { QueryString };
        const { Rows } = await this.queryExecutor.execute({
            params,
            method: this.getLatestHistoricData.name,
        });
        return Rows.map(
            (Row) =>
                new HistoricDataModel({
                    timestamp: Row.Data[0].ScalarValue,
                    value: new BigNumber(Row.Data[1].ScalarValue).toFixed(),
                }),
        );
    }

    async getLatestBinnedHistoricData({
        table,
        time,
        series,
        metric,
        bin,
        start,
    }): Promise<HistoricDataModel[]> {
        if (!this.apiConfig.isAWSTimestreamRead()) {
            return [];
        }

        const formattedStart = moment
            .unix(start)
            .utc()
            .format('yyyy-MM-DD HH:mm:ss');

        const QueryString = `
            WITH max_timeseries AS (
                SELECT max(time) as max_time
                FROM "${this.DatabaseName}".${table}
                WHERE series = '${series}'
                AND measure_name = '${metric}' 
            ), 
            binned_timeseries AS (
                SELECT series, BIN(time, ${bin}) AS binned_timestamp, AVG(measure_value::double) AS avg_value
                FROM "${this.DatabaseName}".${table} 
                WHERE series = '${series}'
                AND measure_name = '${metric}' 
                AND time >= ((SELECT max_time FROM max_timeseries) - parse_duration('${time}'))
                ${start ? `AND time > '${formattedStart}'` : ''}
                GROUP BY series, BIN(time, ${bin})
            ),interpolated_timeseries AS (
                SELECT series,
                    INTERPOLATE_LOCF(
                        CREATE_TIME_SERIES(binned_timestamp, avg_value),
                            SEQUENCE(min(binned_timestamp), max(binned_timestamp), ${bin})) AS interpolated_avg_value
                FROM binned_timeseries
                GROUP BY series
            )
            SELECT time, value 
            FROM interpolated_timeseries
            CROSS JOIN UNNEST(interpolated_avg_value)
        `;

        const params = { QueryString };
        const { Rows } = await this.queryExecutor.execute({
            params,
            method: this.getLatestBinnedHistoricData.name,
        });
        return Rows.map(
            (Row) =>
                new HistoricDataModel({
                    timestamp: Row.Data[0].ScalarValue,
                    value: new BigNumber(Row.Data[1].ScalarValue).toFixed(),
                }),
        );
    }
}
