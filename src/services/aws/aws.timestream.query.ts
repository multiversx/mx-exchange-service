import { Inject, Injectable } from '@nestjs/common';
import { HttpsAgent } from 'agentkeepalive';
import AWS, { TimestreamQuery } from 'aws-sdk';
import BigNumber from 'bignumber.js';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { awsConfig } from 'src/config';
import { HistoricDataModel } from 'src/modules/analytics/models/analytics.model';
import { Logger } from 'winston';

@Injectable()
export class AWSTimestreamQueryService {
    private queryClient: TimestreamQuery;
    private DatabaseName: string;

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
        const values = Rows.map(
            Row =>
                new HistoricDataModel({
                    timestamp: Row.Data[0].ScalarValue,
                    value: new BigNumber(Row.Data[1].ScalarValue).toFixed(),
                }),
        );
        return values;
    }

    async getAgregatedValue({ table, series, metric, time }): Promise<string> {
        const QueryString = `SELECT sum(measure_value::double) FROM "${this.DatabaseName}"."${table}"
                             WHERE series = '${series}' AND measure_name = '${metric}' AND time between ago(${time}) and now()`;
        const params = { QueryString };
        const { Rows } = await this.queryClient.query(params).promise();
        const value = Rows[0] ? Rows[0]?.Data[0]?.ScalarValue : '0';
        return new BigNumber(value).toFixed();
    }
}
