import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { elrondConfig, elrondData } from 'src/config';
import { ApiConfigService } from 'src/helpers/api.config.service';
import { Logger } from 'winston';
import Agent, { HttpsAgent } from 'agentkeepalive';
import axios, { AxiosRequestConfig } from 'axios';
import { HistoricDataModel } from 'src/modules/analytics/models/analytics.model';
import { IngestRecord } from './ingest-records.model';
import { NativeAuthClientService } from 'src/modules/native-auth/native-auth-client.service';
import {
    daysAgoUtc,
    nowUtc,
    oneDayAgoUtc,
    oneMonth,
    splitDateRangeIntoIntervalsUtc,
    toUtc,
} from 'src/helpers/helpers';
import BigNumber from 'bignumber.js';
import { RemoteConfigGetterService } from 'src/modules/remote-config/remote-config.getter.service';

@Injectable()
export class ElrondDataService {
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
        this.url = process.env.ELRONDDATAAPI_URL;

        this.config = {
            timeout: elrondConfig.proxyTimeout,
            httpAgent: elrondConfig.keepAlive ? httpAgent : null,
            httpsAgent: elrondConfig.keepAlive ? httpsAgent : null,
        };
    }

    private async getGenericAxiosConfig(): Promise<any> {
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
                path: `${ElrondDataService.name}.${this.doPostGeneric.name}`,
            });
        }
    }

    private async doParallelPostBatchesGeneric(
        resourceUrl: string,
        payloads: any[],
    ): Promise<any> {
        try {
            let promises: Promise<any>[] = [];
            for (const payload of payloads) {
                promises.push(this.doPostGeneric(resourceUrl, payload));
            }
            const res = await Promise.all(promises);
            return res;
        } catch (error) {
            this.logger.error(error.message, {
                path: `${ElrondDataService.name}.${this.doPostGeneric.name}`,
            });
        }
    }

    async isIngestInactive(): Promise<boolean> {
        return !(await this.remoteConfigGetterService.getTimescaleWriteFlag());
    }

    async isReadActive(): Promise<boolean> {
        return await this.remoteConfigGetterService.getTimescaleReadFlag();
    }

    async ingest(tableName: string, records: IngestRecord[]): Promise<boolean> {
        if (await this.isIngestInactive()) {
            return;
        }

        const query = `mutation { ingestData( table: ${tableName}, input: [ ${records.map(
            (r) => {
                return `{ timestamp: ${r.timestamp}, series: "${r.series}", key: "${r.key}", value: "${r.value}" }`;
            },
        )} ] ) }`;

        const res = await this.doPostGeneric('data-api/graphql', { query });

        const ingested: boolean = res?.data?.ingestData;

        return ingested;
    }

    async ingestObject({ tableName, data, timestamp }): Promise<boolean> {
        if (await this.isIngestInactive()) {
            return;
        }

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

        return await this.ingest(tableName, ingestRecords);
    }

    async getLatestCompleteValues({
        table,
        series,
        key,
    }): Promise<HistoricDataModel[]> {
        const dateIntervals = splitDateRangeIntoIntervalsUtc(
            elrondData.timescale.indexingStartTimeUtc,
            nowUtc(),
            6 * oneMonth(),
        );

        let queries: any[] = [];

        for (let i = 0; i < dateIntervals.length - 1; i++) {
            const startDate = toUtc(dateIntervals[i]);
            const endDate = toUtc(dateIntervals[i + 1]);
            const query = `query generic_query {
                ${table} {
                  metric(
                    series: "${series}"
                    key: "${key}"
                    query: { start_date: "${startDate}", end_date: "${endDate}", resolution: INTERVAL_DAY }
                  ) {
                    max
                    last
                    time
                  }
                }
              }`;
            queries.push({ query });
        }

        const results = await this.doParallelPostBatchesGeneric(
            'data-api/graphql',
            queries,
        );

        let data: HistoricDataModel[] = [];
        for (const result of results) {
            data = data.concat(
                result.data[table]['metric'].map(
                    (r) =>
                        new HistoricDataModel({
                            timestamp: r.time,
                            value: r.last,
                        }),
                ),
            );
        }

        return data;
    }

    async getSumCompleteValues({
        table,
        series,
        key,
    }): Promise<HistoricDataModel[]> {
        const dateIntervals = splitDateRangeIntoIntervalsUtc(
            elrondData.timescale.indexingStartTimeUtc,
            nowUtc(),
            6 * oneMonth(),
        );

        let queries: any[] = [];

        for (let i = 0; i < dateIntervals.length - 1; i++) {
            const startDate = toUtc(dateIntervals[i]);
            const endDate = toUtc(dateIntervals[i + 1]);
            const query = `query generic_query {
                ${table} {
                  metric(
                    series: "${series}"
                    key: "${key}"
                    query: { start_date: "${startDate}", end_date: "${endDate}", resolution: INTERVAL_DAY }
                  ) {
                    sum
                    time
                  }
                }
              }`;
            queries.push({ query });
        }

        const results = await this.doParallelPostBatchesGeneric(
            'data-api/graphql',
            queries,
        );

        let data: HistoricDataModel[] = [];
        for (const result of results) {
            data = data.concat(
                result.data[table]['metric'].map(
                    (r) =>
                        new HistoricDataModel({
                            timestamp: r.time,
                            value: r.sum,
                        }),
                ),
            );
        }

        return data;
    }

    async getLatestValue({ table, series, key }): Promise<string> {
        const query = `query generic_query {
            ${table} {
                metric(
                  series: "${series}"
                  key: "${key}"
               query: {range: MONTH }
                ) {
                    last
                    time
                }
            }
         }`;

        const result = await this.doPostGeneric('data-api/graphql', { query });

        return result.data[table]['metric'][0].last;
    }

    async getValues24h({ table, series, key }): Promise<HistoricDataModel[]> {
        const query = `query generic_query {
            ${table} {
             metric(
               series: "${series}"
               key: "${key}"
               query: { start_date: "${oneDayAgoUtc()}", resolution: INTERVAL_HOUR }
             ) {
               max
               time
             }
           }
         }`;

        const result = await this.doPostGeneric('data-api/graphql', { query });

        const data = result.data[table]['metric'].map(
            (r) =>
                new HistoricDataModel({
                    timestamp: r.time,
                    value: r.max,
                }),
        );

        return data;
    }

    async getValues24hSum({
        table,
        series,
        key,
    }): Promise<HistoricDataModel[]> {
        const query = `query generic_query {
            ${table} {
              metric(
                series: "${series}"
                key: "${key}"
                query: { start_date: "${daysAgoUtc(
                    2,
                )}", resolution: INTERVAL_HOUR, fill_data_gaps: true }
              ) {
                sum
                time
              }
            }
          }
          `;

        const result = await this.doPostGeneric('data-api/graphql', { query });

        const data = result.data[table]['metric'].map(
            (r) =>
                new HistoricDataModel({
                    timestamp: r.time,
                    value: r.sum,
                }),
        );

        const dataWithoutGaps = HistoricDataModel.fillDataGaps(data);

        const last24Entries = dataWithoutGaps.slice(-24);

        return last24Entries;
    }

    async getAggregatedValue({
        table,
        series,
        key,
        startTimeUtc,
    }): Promise<string> {
        const query = `query { 
            ${table} { 
                metric (series: "${series}" key: "${key}" 
                    query: { 
                        start_date: "${startTimeUtc}", 
                        end_date: "${nowUtc()}" 
                    } 
                ) { time sum } 
                } 
            }`;

        const result = await this.doPostGeneric('data-api/graphql', { query });

        const sum = result.data[table].metric[0].sum;

        return sum;
    }

    async getLatestHistoricData({
        table,
        series,
        key,
        startDate,
        endDate,
    }): Promise<HistoricDataModel[]> {
        const query = `query generic_query {
            ${table} {
             values(
               series: "${series}"
               key: "${key}"
               filter: {sort: ASC, start_date: "${startDate}", end_date: "${endDate}"}
             ) {
               value
               time
             }
           }
         }`;

        const result = await this.doPostGeneric('data-api/graphql', { query });

        const data = result.data[table]['values'].map(
            (r) =>
                new HistoricDataModel({
                    timestamp: r.time,
                    value: r.value,
                }),
        );

        return data;
    }

    async getLatestBinnedHistoricData({
        table,
        series,
        key,
        startDate,
        endDate,
        resolution,
    }): Promise<HistoricDataModel[]> {
        const query = `query generic_query {
            ${table} {
             metric(
               series: "${series}"
               key: "${key}"
               query: {start_date: "${startDate}", end_date: "${endDate}", resolution: ${resolution}}
             ) {
               avg
               time
             }
           }
         }`;

        const result = await this.doPostGeneric('data-api/graphql', { query });

        const data = result.data[table]['metric'].map(
            (r) =>
                new HistoricDataModel({
                    timestamp: r.time,
                    value: r.avg,
                }),
        );

        return data;
    }
}
