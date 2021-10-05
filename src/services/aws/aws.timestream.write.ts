import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import AWS, { TimestreamWrite } from 'aws-sdk';
import { HttpsAgent } from 'agentkeepalive';
import { awsConfig } from 'src/config';

@Injectable()
export class AWSTimestreamWriteService {
    private writeClient: TimestreamWrite;
    private DatabaseName: string;

    constructor(
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {
        AWS.config.update({ region: awsConfig.region });
        const httpsAgent = new HttpsAgent({
            maxSockets: 5000,
        });
        this.writeClient = new TimestreamWrite({
            maxRetries: 10,
            httpOptions: {
                timeout: 20000,
                agent: httpsAgent,
            },
        });
        this.DatabaseName = awsConfig.timestream.databaseName;
    }

    async describeTable({ TableName }): Promise<TimestreamWrite.Table> {
        try {
            const params = { DatabaseName: this.DatabaseName, TableName };
            const { Table } = await this.writeClient
                .describeTable(params)
                .promise();
            return Table;
        } catch (error) {
            if (error.code === 'ResourceNotFoundException') {
                return undefined;
            } else {
                this.logger.error('describeTable error', error);
                throw error;
            }
        }
    }

    async createTable({ TableName }): Promise<void> {
        try {
            const params: TimestreamWrite.CreateTableRequest = {
                DatabaseName: this.DatabaseName,
                TableName,
                RetentionProperties: {
                    MemoryStoreRetentionPeriodInHours:
                        awsConfig.timestream.MemoryStoreRetentionPeriodInHours,
                    MagneticStoreRetentionPeriodInDays:
                        awsConfig.timestream.MagneticStoreRetentionPeriodInDays,
                },
            };
            await this.writeClient.createTable(params).promise();
        } catch (error) {
            this.logger.error('createTable error', error);
            throw error;
        }
    }

    createRecords({ Time, data }): TimestreamWrite.Records {
        const MeasureValueType = 'DOUBLE';
        const Records: TimestreamWrite.Records = [];

        Object.keys(data).forEach(series => {
            const Dimensions = [{ Name: 'series', Value: series }];

            Object.keys(data[series]).forEach(MeasureName => {
                const MeasureValue = data[series][MeasureName].toString();
                Records.push({
                    Dimensions,
                    MeasureName,
                    MeasureValue,
                    MeasureValueType,
                    Time,
                });
            });
        });

        return Records;
    }

    async writeRecords({ TableName, Records }): Promise<void> {
        try {
            const params: TimestreamWrite.WriteRecordsRequest = {
                DatabaseName: this.DatabaseName,
                TableName,
                Records,
            };
            await this.writeClient.writeRecords(params).promise();
        } catch (error) {
            this.logger.error('writeRecords error', error);
            throw error;
        }
    }

    async ingest({ TableName, Time, data }) {
        if (!(await this.describeTable({ TableName }))) {
            // await this.createTable({ TableName });
        }

        const Records = this.createRecords({ Time, data });
        console.log(JSON.stringify(Records));
        // await this.writeRecords({ TableName, Records });
    }
}
