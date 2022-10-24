import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { dataApiConfig, elrondConfig } from 'src/config';
import { Logger } from 'winston';
import { TimestreamWrite } from 'aws-sdk';
import { generateLogMessage } from 'src/utils/generate-log-message';
import { IngestRecord } from './entities/ingest.record';
import moment from 'moment';
import Agent, { HttpsAgent } from 'agentkeepalive';
import { ApiConfigService } from 'src/helpers/api.config.service';
import axios, { AxiosRequestConfig } from 'axios';
import { MetricsCollector } from 'src/utils/metrics.collector';
import { PerformanceProfiler } from 'src/utils/performance.profiler';
import { NativeAuthSigner } from 'src/utils/native.auth.signer';

@Injectable()
export class DataApiWriteService {
    private readonly TableName: string;
    private url: string;
    private config: AxiosRequestConfig;
    private nativeAuthSigner: NativeAuthSigner;

    constructor(
        private readonly apiConfigService: ApiConfigService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {
        this.TableName = dataApiConfig.tableName;

        const keepAliveOptions = {
            maxSockets: elrondConfig.keepAliveMaxSockets,
            maxFreeSockets: elrondConfig.keepAliveMaxFreeSockets,
            timeout: this.apiConfigService.getKeepAliveTimeoutDownstream(),
            freeSocketTimeout: elrondConfig.keepAliveFreeSocketTimeout,
            keepAlive: true,
        };
        const httpAgent = new Agent(keepAliveOptions);
        const httpsAgent = new HttpsAgent(keepAliveOptions);
        this.url = process.env.ELRONDDATAAPI_URL;

        this.config = {
            timeout: elrondConfig.proxyTimeout,
            httpAgent: elrondConfig.keepAlive ? httpAgent : null,
            httpsAgent: elrondConfig.keepAlive ? httpsAgent : null,
        };

        this.nativeAuthSigner = new NativeAuthSigner({
            host: 'MaiarExchangeService',
            apiUrl: this.apiConfigService.getApiUrl(),
            signerPrivateKey: this.apiConfigService.getNativeAuthKey(),
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
                error.message,
            );
            this.logger.error(logMessage);
        }
    }

    async multiRecordsIngest(Records: TimestreamWrite.Records) {
        try {
            const ingestRecords = this.convertAWSRecordsToDataAPIRecords(Records);
            await this.writeRecords(ingestRecords);
        } catch (error) {
            const logMessage = generateLogMessage(
                DataApiWriteService.name,
                this.multiRecordsIngest.name,
                '',
                error.message,
            );
            this.logger.error(logMessage);
        }
    }

    private async writeRecords(records: IngestRecord[]): Promise<void> {
        try {
            const mutation = this.generateIngestMutation(records);
            await this.doPost('ingestData', { query: mutation })
        } catch (error) {
            const logMessage = generateLogMessage(
                DataApiWriteService.name,
                this.writeRecords.name,
                '',
                error.message,
            );
            this.logger.error(logMessage);
        }
    }

    private async doPost(name: string, data: any): Promise<any> {
        const profiler = new PerformanceProfiler(name);
        try {
            const config = await this.getConfig();
            const response = await axios.post(this.url, data, config);
            return response.data;
        } catch (error) {
            throw error;
        } finally {
            profiler.stop();

            MetricsCollector.setExternalCall(
                DataApiWriteService.name,
                name,
                profiler.duration,
            );
        }
    }

    createRecords({ data, Time }): IngestRecord[] {
        const records: IngestRecord[] = [];
        Object.keys(data).forEach(series => {
            Object.keys(data[series]).forEach(key => {
                const value = data[series][key].toString();
                records.push(new IngestRecord({
                    series,
                    key,
                    value,
                    timestamp: Time
                }))
            });
        });

        return records;
    }

    private generateIngestMutation(records: IngestRecord[]): string {
        const mutation = `
            mutation ingest {
                ingestData(
                    table: ${this.TableName}
                    input: ${JSON.stringify(records)}
                )
            }`;
        return mutation;
    }

    private convertAWSRecordsToDataAPIRecords(Records: TimestreamWrite.Records): IngestRecord[] {
        const ingestRecords = Records.map(record => {
            return new IngestRecord({
                timestamp: moment(record.Time).unix(),
                series: record.Dimensions[0].Value,
                key: record.MeasureName,
                value: record.MeasureValue,
            });
        })
        return ingestRecords;
    }

    private async getConfig(): Promise<AxiosRequestConfig> {
        const accessTokenInfo = await this.nativeAuthSigner.getToken();
        return {
            ...this.config,
            headers: {
                Authorization: `Bearer ${accessTokenInfo.token}`,
                authorization: `Bearer ${accessTokenInfo.token}`,
            },
        };
    }
}
