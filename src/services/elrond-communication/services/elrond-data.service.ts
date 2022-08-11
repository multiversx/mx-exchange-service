import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { elrondConfig } from 'src/config';
import { ApiConfigService } from 'src/helpers/api.config.service';
import { Logger } from 'winston';
import Agent, { HttpsAgent } from 'agentkeepalive';
import axios, { AxiosRequestConfig } from 'axios';
import { HistoricDataModel } from 'src/modules/analytics/models/analytics.model';
import { IngestRecord } from '../models/ingest-records.model';
import { NativeAuthClientService } from 'src/modules/native-auth/native-auth-client.service';

@Injectable()
export class ElrondDataService {
    private readonly url: string;
    private readonly config: AxiosRequestConfig;

    constructor(
        private readonly apiConfigService: ApiConfigService,
        private readonly nativeAuthClientService: NativeAuthClientService,
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
        this.url = process.env.ELRONDDATAAPI_URL;

        this.config = {
            timeout: elrondConfig.proxyTimeout,
            httpAgent: elrondConfig.keepAlive ? httpAgent : null,
            httpsAgent: elrondConfig.keepAlive ? httpsAgent : null,
        };
    }

    private async getGenericAxiosConfig(): Promise<any> {
        return {
            ...this.config,
            headers: {
                Authorization: await this.nativeAuthClientService.getToken(),
            },
        };
    }

    private async doGetGeneric(resourceUrl: string): Promise<any> {
        try {
            const url = `${this.url}/${resourceUrl}`;
            const config = await this.getGenericAxiosConfig();
            const response = await axios.get(url, config);
            return response.data;
        } catch (error) {
            this.logger.error(error.message, {
                path: `${ElrondDataService.name}.${this.doGetGeneric.name}`,
            });
        }
    }

    private async doPostGeneric(resourceUrl: string, data: any): Promise<any> {
        try {
            const url = `${this.url}/${resourceUrl}`;
            const config = await this.getGenericAxiosConfig();
            const response = await axios.post(url, data, config);
            return response.data;
        } catch (error) {
            this.logger.error(error.message, {
                path: `${ElrondDataService.name}.${this.doPostGeneric.name}`,
            });
        }
    }

    async ingest(
        tableName: string,
        records: IngestRecord | IngestRecord[],
    ): Promise<boolean> {
        let ingestRecords: IngestRecord[];

        if (Array.isArray(records)) {
            ingestRecords = JSON.parse(JSON.stringify(records));
        } else {
            ingestRecords = [JSON.parse(JSON.stringify(records))];
        }

        let input: string = '[';
        for (const r of ingestRecords) {
            input += `{ timestamp: ${r.timestamp}, series: "${r.series}", key: "${r.key}", value: "${r.value}"}`;
        }
        input += ']';

        const query = `mutation ingest {
            ingestData(
              table: ${tableName}
              input: ${input}
            )
          }`;

        const res = await this.doPostGeneric('data-api/graphql', { query });

        const ingested: boolean = res?.data?.ingestData;

        return ingested;
    }

    async ingestObject(
        tableName: string,
        data: any,
        timestamp: number,
    ): Promise<boolean> {
        let ingestRecords: IngestRecord[] = [];

        Object.keys(data).forEach(series => {
            Object.keys(data[series]).forEach(MeasureName => {
                const MeasureValue = data[series][MeasureName].toString();
                ingestRecords.push({
                    series,
                    key: MeasureName,
                    value: MeasureValue,
                    timestamp: timestamp,
                });
            });
        });

        return await this.ingest(tableName, ingestRecords);
    }

    /**************** READ - IN PROGRESS ****************/
    /*async getLatestValue(tableName: string, { series, metric }): Promise<string> {
        return await this.doGetGeneric('replaceMe');
    }

    async getValues({
        table,
        series,
        metric,
        time,
    }): Promise<HistoricDataModel[]> {
        return await this.doGetGeneric('replaceMe');
    }

    async getAggregatedValue({ table, series, metric, time }): Promise<string> {
        return await this.doGetGeneric('replaceMe');
    }

    async getClosingValue({ table, series, metric, time }): Promise<string> {
        return await this.doGetGeneric('replaceMe');
    }

    async getCompleteValues({
        table,
        series,
        metric,
    }): Promise<HistoricDataModel[]> {
        return await this.doGetGeneric('replaceMe');
    }

    async getLatestCompleteValues({
        table,
        series,
        metric,
    }): Promise<HistoricDataModel[]> {
        return await this.doGetGeneric('replaceMe');
    }

    async getSumCompleteValues({
        table,
        series,
        metric,
    }): Promise<HistoricDataModel[]> {
        return await this.doGetGeneric('replaceMe');
    }

    async getLatestValues({
        table,
        series,
        metric,
    }): Promise<HistoricDataModel[]> {
        return await this.doGetGeneric('replaceMe');
    }

    async getSeries({ table, series, metric }): Promise<HistoricDataModel[]> {
        return await this.doGetGeneric('replaceMe');
    }

    async getMarketValues({
        table,
        series,
        metric,
    }): Promise<HistoricDataModel[]> {
        return await this.doGetGeneric('replaceMe');
    }

    async getMarketCompleteValues({
        table,
        series,
        metric,
    }): Promise<HistoricDataModel[]> {
        return await this.doGetGeneric('replaceMe');
    }

    async getValues24h({
        table,
        series,
        metric,
    }): Promise<HistoricDataModel[]> {
        return await this.doGetGeneric('replaceMe');
    }

    async getValues24hSum({
        table,
        series,
        metric,
    }): Promise<HistoricDataModel[]> {
        return await this.doGetGeneric('replaceMe');
    }

    async getLatestHistoricData({
        table,
        time,
        series,
        metric,
        start,
    }): Promise<HistoricDataModel[]> {
        return await this.doGetGeneric('replaceMe');
    }

    async getLatestBinnedHistoricData({
        table,
        time,
        series,
        metric,
        bin,
        start,
    }): Promise<HistoricDataModel[]> {
        return await this.doGetGeneric('replaceMe');
    }*/
}
