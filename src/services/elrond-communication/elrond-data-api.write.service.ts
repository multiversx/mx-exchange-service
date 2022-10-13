import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { elrondConfig } from 'src/config';
import { ApiConfigService } from 'src/helpers/api.config.service';
import { Logger } from 'winston';
import Agent, { HttpsAgent } from 'agentkeepalive';
import axios, { AxiosRequestConfig } from 'axios';
import { IngestRecord } from './ingest-records.model';
import { NativeAuthClientService } from 'src/modules/native-auth/native-auth-client.service';
import BigNumber from 'bignumber.js';
import { RemoteConfigGetterService } from 'src/modules/remote-config/remote-config.getter.service';

@Injectable()
export class ElrondDataApiWriteService {
    private readonly url: string;
    private readonly config: AxiosRequestConfig;

    constructor(
        private readonly apiConfigService: ApiConfigService,
        private readonly nativeAuthClientService: NativeAuthClientService,
        private readonly remoteConfigGetterService: RemoteConfigGetterService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {
        const keepAliveOptions = {
            maxSockets: elrondConfig.keepAliveMaxSockets,
            maxFreeSockets: elrondConfig.keepAliveMaxFreeSockets,
            timeout: this.apiConfigService.getKeepAliveTimeoutDownstream(),
            freeSocketTimeout: elrondConfig.keepAliveFreeSocketTimeout,
            keepAlive: true,
        };
        const httpAgent = new Agent(keepAliveOptions);
        const httpsAgent = new HttpsAgent(keepAliveOptions);
        this.url = this.apiConfigService.getElrondDataApiUrl();

        this.config = {
            timeout: elrondConfig.proxyTimeout,
            httpAgent: elrondConfig.keepAlive ? httpAgent : null,
            httpsAgent: elrondConfig.keepAlive ? httpsAgent : null,
        };
    }

    private async getGenericAxiosConfig(): Promise<AxiosRequestConfig> {
        const accessToken = await this.nativeAuthClientService.getToken();
        return {
            ...this.config,
            headers: {
                Authorization: accessToken,
                authorization: accessToken,
            },
        };
    }

    private async doPostGeneric(resourceUrl: string, data: any): Promise<any> {
        try {
            const url = `${this.url}/${resourceUrl}`;
            const config = await this.getGenericAxiosConfig();
            const response = await axios.post(url, data, config);
            return response.data;
        } catch (error) {
            this.logger.error(error.message, {
                path: `${ElrondDataApiWriteService.name}.${this.doPostGeneric.name}`,
            });
        }
    }

    async isIngestInactive(): Promise<boolean> {
        return !(await this.remoteConfigGetterService.getTimescaleWriteFlag());
    }

    async isReadActive(): Promise<boolean> {
        return await this.remoteConfigGetterService.getTimescaleReadFlag();
    }

    async ingest(records: IngestRecord[]): Promise<boolean> {
        if (await this.isIngestInactive()) {
            return;
        }

        const query = `mutation { ingestData( table: maiar_exchange_analytics, input: [ ${records.map((r) => {
            return `{ timestamp: ${r.timestamp}, series: "${r.series}", key: "${r.key}", value: "${r.value}" }`;
        })} ] ) }`;

        const res = await this.doPostGeneric('data-api/graphql', { query });

        const ingested: boolean = res?.data?.ingestData;

        return ingested;
    }

    async ingestObject({ data, timestamp }): Promise<boolean> {
        if (await this.isIngestInactive()) {
            return;
        }

        let ingestRecords = this.objectToIngestRecords({ data, timestamp });

        return await this.ingest(ingestRecords);
    }

    objectToIngestRecords({ data, timestamp }): IngestRecord[] {
        let ingestRecords: IngestRecord[] = [];

        Object.keys(data).forEach((series) => {
            Object.keys(data[series]).forEach((MeasureName) => {
                const MeasureValue = new BigNumber(
                    data[series][MeasureName],
                ).toString();
                ingestRecords.push({
                    series,
                    key: MeasureName,
                    value: MeasureValue,
                    timestamp: timestamp,
                });
            });
        });

        return ingestRecords;
    }
}
