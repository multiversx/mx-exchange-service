import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import AWS, { TimestreamWrite } from 'aws-sdk';
import { HttpsAgent } from 'agentkeepalive';
import { awsConfig } from 'src/config';
import { ApiConfigService } from 'src/helpers/api.config.service';

@Injectable()
export class AWSTimestreamWriteService {
    private writeClient: TimestreamWrite;
    private readonly DatabaseName: string;

    constructor(
        private readonly apiConfig: ApiConfigService,
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
        this.DatabaseName = this.apiConfig.getAWSDatabaseName();
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
                        this.apiConfig.getAWSMemoryStoreRetention(),
                    MagneticStoreRetentionPeriodInDays:
                        this.apiConfig.getAWSMagneticStoreRetention(),
                },
            };
            await this.writeClient.createTable(params).promise();
        } catch (error) {
            this.logger.error('createTable error', error);
            throw error;
        }
    }

    createRecords({ data, Time }): TimestreamWrite.Records {
        const MeasureValueType = 'DOUBLE';
        const Records: TimestreamWrite.Records = [];
        Object.keys(data).forEach((series) => {
            const Dimensions = [{ Name: 'series', Value: series }];

            Object.keys(data[series]).forEach((MeasureName) => {
                const MeasureValue = data[series][MeasureName].toString();
                Records.push({
                    Dimensions,
                    MeasureName,
                    MeasureValue,
                    MeasureValueType,
                    Time: Time.toString(),
                    TimeUnit: 'SECONDS',
                    Version: Date.now(),
                });
            });
        });

        return Records;
    }

    async writeRecords({ TableName, Records }): Promise<void> {
        let request: AWS.Request<{}, AWS.AWSError>;
        try {
            const params: TimestreamWrite.WriteRecordsRequest = {
                DatabaseName: this.DatabaseName,
                TableName,
                Records,
            };
            request = this.writeClient.writeRecords(params);
            await request.promise();
        } catch (error) {
            this.logger.error(
                `${AWSTimestreamWriteService.name}.${this.writeRecords.name}`,
                [JSON.stringify(error)],
            );
            if (error.code === 'RejectedRecordsException') {
                this.printRejectedRecordsException(request, Records);
            }
        }
    }

    async ingest({ TableName, data, Time }) {
        if (!(await this.describeTable({ TableName }))) {
            await this.createTable({ TableName });
        }

        const Records = this.createRecords({ data, Time });
        await this.writeRecords({ TableName, Records });
    }

    async multiRecordsIngest(
        TableName: string,
        Records: TimestreamWrite.Records,
    ) {
        if (!(await this.describeTable({ TableName }))) {
            await this.createTable({ TableName });
        }

        await this.writeRecords({ TableName, Records });
    }

    private printRejectedRecordsException(request, Records) {
        const responsePayload = JSON.parse(
            request.response.httpResponse.body.toString(),
        );
        for (const rejectedRecord of responsePayload.RejectedRecords) {
            this.logger.error(rejectedRecord.Reason, [
                JSON.stringify(Records[rejectedRecord.RecordIndex]),
            ]);
        }
    }
}
