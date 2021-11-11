import { Inject, Injectable } from '@nestjs/common';
import { HttpsAgent } from 'agentkeepalive';
import AWS, { TimestreamQuery } from 'aws-sdk';
import BigNumber from 'bignumber.js';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { awsConfig } from 'src/config';
import { HistoricDataModel } from 'src/modules/analytics/models/analytics.model';
import { Logger } from 'winston';
import moment from 'moment';

@Injectable()
export class AWSTimestreamQueryService {
    private queryClient: TimestreamQuery;
    private readonly DatabaseName: string;

    constructor(
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {
        AWS.config.update({ region: awsConfig.region });
        const httpsAgent = new HttpsAgent({
            maxSockets: 5000,
        });
        this.queryClient = new TimestreamQuery({
            maxRetries: 10,
            httpOptions: {
                timeout: 20000,
                agent: httpsAgent,
            },
        });
        this.DatabaseName = awsConfig.timestream.databaseName;
    }

    async getLatestValue({ table, series, metric }): Promise<string> {
        const QueryString = `SELECT measure_value::double FROM "${this.DatabaseName}"."${table}"
                             WHERE series = '${series}' AND measure_name = '${metric}'
                             ORDER BY time DESC
                             LIMIT 1`;

        const params = { QueryString };
        const { Rows } = await this.queryClient.query(params).promise();
        const value = Rows[0] ? Rows[0]?.Data[0]?.ScalarValue : '0';
        return new BigNumber(value).toFixed();
    }

    async getValues({
        table,
        series,
        metric,
        time,
    }): Promise<HistoricDataModel[]> {
        const QueryString = `SELECT time, measure_value::double FROM "${this.DatabaseName}"."${table}"
                             WHERE series = '${series}' AND measure_name = '${metric}' AND time BETWEEN ago(${time}) AND now()
                             ORDER BY time DESC`;

        const params = { QueryString };
        const { Rows } = await this.queryClient.query(params).promise();
        return Rows.map(
            Row =>
                new HistoricDataModel({
                    timestamp: Row.Data[0].ScalarValue,
                    value: new BigNumber(Row.Data[1].ScalarValue).toFixed(),
                }),
        );
    }

    async getAggregatedValue({ table, series, metric, time }): Promise<string> {
        const QueryString = `SELECT sum(measure_value::double) FROM "${this.DatabaseName}"."${table}"
                             WHERE series = '${series}' AND measure_name = '${metric}' AND time between ago(${time}) and now()`;
        const params = { QueryString };
        const { Rows } = await this.queryClient.query(params).promise();
        const value = Rows[0] ? Rows[0]?.Data[0]?.ScalarValue : '0';
        return new BigNumber(value).toFixed();
    }

    async getClosingValue({ table, series, metric, time }): Promise<string> {
        const gte = moment
            .unix(time)
            .utc()
            .startOf('day')
            .format('yyyy-MM-DD HH:mm:ss');
        const lte = moment
            .unix(time)
            .utc()
            .endOf('day')
            .format('yyyy-MM-DD HH:mm:ss');

        const QueryString = `
            SELECT ROUND(a.measure_value::double, 2) AS value
            FROM "${this.DatabaseName}"."${table}" a INNER JOIN
            (
                SELECT max(time) as max 
                FROM "${this.DatabaseName}"."${table}" 
                WHERE series = '${series}'
                    AND measure_name = '${metric}'
                    AND time >= '${gte}'
                    AND time <= '${lte}'
                    GROUP BY date(time)
            ) b on a.time = b.max
            WHERE series = '${series}'
                AND measure_name = '${metric}'
                AND time >= '${gte}' 
                AND time <= '${lte}'  
            GROUP by a.time,  ROUND(a.measure_value::double, 2)
            ORDER BY a.time ASC
        `;
        const params = { QueryString };
        const { Rows } = await this.queryClient.query(params).promise();
        const value = Rows[0] ? Rows[0]?.Data[0]?.ScalarValue : '0';
        return new BigNumber(value).toFixed();
    }

    async getCompleteValues({
        table,
        series,
        metric,
    }): Promise<HistoricDataModel[]> {
        const QueryString = `
            WITH binned_timeseries AS (
                SELECT series, BIN(time, 24h) AS binned_timestamp, ROUND(AVG(measure_value::double), 2) AS avg_value
                FROM "${this.DatabaseName}".${table}
                WHERE measure_name = '${metric}'
                    AND series = '${series}'
                GROUP BY series, BIN(time, 24h)
            ), interpolated_timeseries AS (
                SELECT series,
                    INTERPOLATE_LOCF(
                        CREATE_TIME_SERIES(binned_timestamp, avg_value),
                            SEQUENCE(min(binned_timestamp), max(binned_timestamp), 24h)) AS interpolated_avg_value
                FROM binned_timeseries
                GROUP BY series
            )
            SELECT time, ROUND(value, 2) AS value
            FROM interpolated_timeseries
            CROSS JOIN UNNEST(interpolated_avg_value)
      `;

        const params = { QueryString };
        const { Rows } = await this.queryClient.query(params).promise();
        return Rows.map(
            Row =>
                new HistoricDataModel({
                    timestamp: Row.Data[0].ScalarValue,
                    value: new BigNumber(Row.Data[1].ScalarValue).toFixed(),
                }),
        );
    }

    async getLatestCompleteValues({
        table,
        series,
        metric,
    }): Promise<HistoricDataModel[]> {
        const QueryString = `
            SELECT date_trunc('day', time) as time, max(value) as value 
            FROM (
              (
                SELECT 
                  time,
                  ROUND(a.measure_value::double, 2) AS value
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
                GROUP by a.time,  ROUND(a.measure_value::double, 2)
                ORDER BY a.time ASC
              )
            ) 
            GROUP BY date_trunc('day', time)
            ORDER BY time ASC
        `;

        const params = { QueryString };
        const { Rows } = await this.queryClient.query(params).promise();
        return Rows.map(
            Row =>
                new HistoricDataModel({
                    timestamp: Row.Data[0].ScalarValue,
                    value: new BigNumber(Row.Data[1].ScalarValue).toFixed(),
                }),
        );
    }

    async getLatestValues({
        table,
        series,
        metric,
    }): Promise<HistoricDataModel[]> {
        const QueryString = `
            SELECT date_trunc('day', time) as time, max(value) as value 
            FROM (
              (
                SELECT 
                  time,
                  ROUND(a.measure_value::double, 2) AS value
                FROM "${this.DatabaseName}".${table} a
                INNER JOIN
                  (
                    SELECT max(time) as max 
                    FROM "${this.DatabaseName}".${table} 
                      WHERE series = '${series}'
                      AND measure_name = '${metric}'
                    AND time > ago(30d)
                    GROUP BY date(time)
                  ) b
                  on a.time = b.max
                WHERE series = '${series}'
                AND measure_name = '${metric}'
                AND time > ago(30d)   
                GROUP by a.time,  ROUND(a.measure_value::double, 2)
                ORDER BY a.time ASC
              )
            ) 
            GROUP BY date_trunc('day', time)
            ORDER BY time ASC
        `;
        const params = { QueryString };
        const { Rows } = await this.queryClient.query(params).promise();
        return Rows.map(
            Row =>
                new HistoricDataModel({
                    timestamp: Row.Data[0].ScalarValue,
                    value: new BigNumber(Row.Data[1].ScalarValue).toFixed(),
                }),
        );
    }

    async getSeries({ table, series, metric }): Promise<HistoricDataModel[]> {
        const QueryString = `
            WITH binned_timeseries AS (
                SELECT series, BIN(time, 24h) AS binned_timestamp, ROUND(AVG(measure_value::double), 2) AS avg_value
                FROM "${this.DatabaseName}".${table}
                WHERE measure_name = '${metric}'
                    AND series = '${series}'
                    AND time > ago(30d)
                GROUP BY series, BIN(time, 24h)
            ), interpolated_timeseries AS (
                SELECT series,
                    INTERPOLATE_LOCF(
                        CREATE_TIME_SERIES(binned_timestamp, avg_value),
                            SEQUENCE(min(binned_timestamp), max(binned_timestamp), 24h)) AS interpolated_avg_value
                FROM binned_timeseries
                GROUP BY series
            )
            SELECT time, ROUND(value, 2) AS value
            FROM interpolated_timeseries
            CROSS JOIN UNNEST(interpolated_avg_value)
      `;
        const params = { QueryString };
        const { Rows } = await this.queryClient.query(params).promise();
        return Rows.map(
            Row =>
                new HistoricDataModel({
                    timestamp: Row.Data[0].ScalarValue,
                    value: new BigNumber(Row.Data[1].ScalarValue).toFixed(),
                }),
        );
    }

    async getMarketValues({
        table,
        series,
        metric,
    }): Promise<HistoricDataModel[]> {
        const QueryString = `
            SELECT date_trunc('day', time) as time, max(value) as value 
            FROM (
              (
                SELECT 
                  TIMESTAMPADD('DAY', -1, time) as time,
                  ROUND(a.measure_value::double, 2) AS value
                FROM "${this.DatabaseName}".${table} a
                INNER JOIN
                  (
                    SELECT min(time) as min 
                    FROM "${this.DatabaseName}".${table} 
                      WHERE series = '${series}'
                      AND measure_name = '${metric}'
                    AND time > ago(29d)
                    GROUP BY date(time)
                  ) b
                  on a.time = b.min
                WHERE series = '${series}'
                AND measure_name = '${metric}'
                AND time > ago(29d)   
                GROUP by a.time,  ROUND(a.measure_value::double, 2)
                ORDER BY a.time ASC
              )
              UNION
              (
                SELECT time, ROUND(measure_value::double, 2) as value
                    FROM "${this.DatabaseName}".${table} 
                WHERE series = '${series}'
                  AND measure_name = '${metric}'
                ORDER BY time DESC 
                LIMIT 1
              )
            ) 
            GROUP BY date_trunc('day', time)
            ORDER BY time ASC
        `;
        const params = { QueryString };
        const { Rows } = await this.queryClient.query(params).promise();
        return Rows.map(
            Row =>
                new HistoricDataModel({
                    timestamp: Row.Data[0].ScalarValue,
                    value: new BigNumber(Row.Data[1].ScalarValue).toFixed(),
                }),
        );
    }

    async getMarketCompleteValues({
        table,
        series,
        metric,
    }): Promise<HistoricDataModel[]> {
        const QueryString = `
            SELECT date_trunc('day', time) as time, max(value) as value 
            FROM (
              (
                SELECT 
                  TIMESTAMPADD('DAY', -1, time) as time,
                  ROUND(a.measure_value::double, 2) AS value
                FROM "${this.DatabaseName}".${table} a
                INNER JOIN
                  (
                    SELECT min(time) as min 
                    FROM "${this.DatabaseName}".${table} 
                      WHERE series = '${series}'
                      AND measure_name = '${metric}'
                    GROUP BY date(time)
                  ) b
                  on a.time = b.min
                WHERE series = '${series}'
                AND measure_name = '${metric}'
                GROUP by a.time,  ROUND(a.measure_value::double, 2)
                ORDER BY a.time ASC
              )
              UNION
              (
                SELECT time, ROUND(measure_value::double, 2) as value
                    FROM "${this.DatabaseName}".${table} 
                WHERE series = '${series}'
                  AND measure_name = '${metric}'
                ORDER BY time DESC 
                LIMIT 1
              )
            ) 
            GROUP BY date_trunc('day', time)
            ORDER BY time ASC
        `;
        const params = { QueryString };
        const { Rows } = await this.queryClient.query(params).promise();
        return Rows.map(
            Row =>
                new HistoricDataModel({
                    timestamp: Row.Data[0].ScalarValue,
                    value: new BigNumber(Row.Data[1].ScalarValue).toFixed(),
                }),
        );
    }
}
