import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { dataApiConfig, elrondConfig } from 'src/config';
import { Logger } from 'winston';
import { TimestreamWrite } from 'aws-sdk';
import { generateLogMessage } from 'src/utils/generate-log-message';
import { IngestRecord } from './entities/ingest.record';
import moment from 'moment';
import { ApiConfigService } from 'src/helpers/api.config.service';
import { MetricsCollector } from 'src/utils/metrics.collector';
import { PerformanceProfiler } from 'src/utils/performance.profiler';
import { AnalyticsWriteInterface } from '../interfaces/analytics.write.interface';
import { DataApiClient } from '@elrondnetwork/erdjs-data-api-client';
import fs from 'fs';

@Injectable()
export class DataApiWriteService implements AnalyticsWriteInterface {
    private readonly TableName: string;
    private readonly dataApiClient: DataApiClient;

    constructor(
        private readonly apiConfigService: ApiConfigService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {
        this.TableName = dataApiConfig.tableName;

        this.dataApiClient = new DataApiClient({
            host: 'dex-service',
            dataApiUrl: process.env.ELRONDDATAAPI_URL,
            multiversXApiUrl: this.apiConfigService.getApiUrl(),
            proxyTimeout: elrondConfig.proxyTimeout,
            keepAlive: {
                maxSockets: elrondConfig.keepAliveMaxSockets,
                maxFreeSockets: elrondConfig.keepAliveMaxFreeSockets,
                timeout: this.apiConfigService.getKeepAliveTimeoutDownstream(),
                freeSocketTimeout: elrondConfig.keepAliveFreeSocketTimeout,
            },
            signerPrivateKey: fs.readFileSync(this.apiConfigService.getNativeAuthKeyPath()).toString(),
        });
    }

    async ingest({ data, Time }) {
        try {
            const records = this.createRecords({ data, Time });
            await this.writeRecords(records);
        } catch (error) {
            const logMessage = generateLogMessage(
                DataApiWriteService.name,
                this.ingest.name,
                '',
                {
                    message: error.message,
                    response: error.response?.data,
                    status: error.response?.status,
                },
            );
            this.logger.error(logMessage);
        }
    }

    async multiRecordsIngest(_tableName: string, Records: TimestreamWrite.Records) {
        try {
            const ingestRecords = this.convertAWSRecordsToDataAPIRecords(Records);
            await this.writeRecords(ingestRecords);
        } catch (error) {
            const logMessage = generateLogMessage(
                DataApiWriteService.name,
                this.multiRecordsIngest.name,
                '',
                {
                    message: error.message,
                    response: error.response?.data,
                    status: error.response?.status,
                },
            );
            this.logger.error(logMessage);
        }
    }

    private async writeRecords(records: IngestRecord[]): Promise<void> {
        const profiler = new PerformanceProfiler('ingestData');

        try {
            const mutation = this.generateIngestMutation(records);
            await this.dataApiClient.executeRawQuery(mutation)
        } catch (error) {
            const logMessage = generateLogMessage(
                DataApiWriteService.name,
                this.writeRecords.name,
                '',
                {
                    message: error.message,
                    response: error.response?.data,
                    status: error.response?.status,
                },
            );
            this.logger.error(logMessage);
        } finally {
            profiler.stop();

            MetricsCollector.setExternalCall(
                DataApiWriteService.name,
                'ingestData',
                profiler.duration,
            );
        }
    }

    createRecords({ data, Time }): IngestRecord[] {
        const records: IngestRecord[] = [];
        Object.keys(data).forEach((series) => {
            Object.keys(data[series]).forEach((key) => {
                const value = data[series][key].toString();
                records.push(
                    new IngestRecord({
                        series,
                        key,
                        value,
                        timestamp: Time,
                    }),
                );
            });
        });
        return records;
    }

    private generateIngestMutation(records: IngestRecord[]): {
        query: string;
        variables: any;
    } {
        const query = `
            mutation ingest($records: [GenericIngestInput!]!) {
                ingestData(
                    table: ${this.TableName}
                    input: $records
                )
            }`;
        const variables = {
            records,
        };

        return { query, variables };
    }

    private convertAWSRecordsToDataAPIRecords(
        Records: TimestreamWrite.Records,
    ): IngestRecord[] {
        const ingestRecords = Records.map((record) => {
            return new IngestRecord({
                timestamp: moment(parseInt(record.Time)).unix(),
                series: record.Dimensions[0].Value,
                key: record.MeasureName,
                value: record.MeasureValue,
            });
        });
        return ingestRecords;
    }
}
