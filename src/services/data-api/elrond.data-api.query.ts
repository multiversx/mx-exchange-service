import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { elrondConfig } from 'src/config';
import { ApiConfigService } from 'src/helpers/api.config.service';
import { Logger } from 'winston';
import Agent, { HttpsAgent } from 'agentkeepalive';
import axios, { AxiosRequestConfig } from 'axios';
import { HistoricDataModel } from 'src/modules/analytics/models/analytics.model';
import { NativeAuthClientService } from 'src/modules/native-auth/native-auth-client.service';
import {
    daysAgoUtc,
    nowUtc,
    oneDayAgoUtc,
    oneMonth,
    splitDateRangeIntoIntervalsUtc,
    toUtc,
} from 'src/helpers/helpers';
import { RemoteConfigGetterService } from 'src/modules/remote-config/remote-config.getter.service';

@Injectable()
export class ElrondDataApiQueryService {
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
                path: `${ElrondDataApiQueryService.name}.${this.doPostGeneric.name}`,
            });
        }
    }

    private async doParallelPostBatchesGeneric(
        resourceUrl: string,
        payloads: any[],
    ): Promise<any> {
        try {
            const promises = payloads.map((payload) =>
                this.doPostGeneric(resourceUrl, payload),
            );
            return await Promise.all(promises);
        } catch (error) {
            this.logger.error(error.message, {
                path: `${ElrondDataApiQueryService.name}.${this.doPostGeneric.name}`,
            });
        }
    }

    async isReadActive(): Promise<boolean> {
        return await this.remoteConfigGetterService.getTimescaleReadFlag();
    }

    async getLatestCompleteValues({
        series,
        key,
    }): Promise<HistoricDataModel[]> {
        const dateIntervals = splitDateRangeIntoIntervalsUtc(
            'elrondData.timescale.indexingStartTimeUtc', // TODO
            nowUtc(),
            6 * oneMonth(),
        );

        const queries: any[] = [];

        for (let i = 0; i < dateIntervals.length - 1; i++) {
            const startDate = toUtc(dateIntervals[i]);
            const endDate = toUtc(dateIntervals[i + 1]);
            const query = `query generic_query {
                maiar_exchange_analytics {
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
                result.data.maiar_exchange_analytics['metric'].map(
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

    async getSumCompleteValues({ series, key }): Promise<HistoricDataModel[]> {
        const dateIntervals = splitDateRangeIntoIntervalsUtc(
            'elrondData.timescale.indexingStartTimeUtc', // TODO
            nowUtc(),
            6 * oneMonth(),
        );

        const queries: any[] = [];

        for (let i = 0; i < dateIntervals.length - 1; i++) {
            const startDate = toUtc(dateIntervals[i]);
            const endDate = toUtc(dateIntervals[i + 1]);
            const query = `query generic_query {
                maiar_exchange_analytics {
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
                result.data.maiar_exchange_analytics['metric'].map(
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

    async getLatestValue({ series, key }): Promise<string> {
        const query = `query generic_query {
            maiar_exchange_analytics {
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

        return result.data.maiar_exchange_analytics['metric'][0].last;
    }

    async getValues24h({ series, key }): Promise<HistoricDataModel[]> {
        const query = `query generic_query {
            maiar_exchange_analytics {
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

        const data = result.data.maiar_exchange_analytics['metric'].map(
            (r) =>
                new HistoricDataModel({
                    timestamp: r.time,
                    value: r.max,
                }),
        );

        return data;
    }

    async getValues24hSum({ series, key }): Promise<HistoricDataModel[]> {
        const query = `query generic_query {
            maiar_exchange_analytics {
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

        const data = result.data.maiar_exchange_analytics['metric'].map(
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

    async getAggregatedValue({ series, key, start }): Promise<string> {
        const query = `query { 
            maiar_exchange_analytics { 
                metric (series: "${series}" key: "${key}" 
                    query: { 
                        start_date: "${start}", 
                        end_date: "${nowUtc()}" 
                    } 
                ) { time sum } 
                } 
            }`;

        const result = await this.doPostGeneric('data-api/graphql', { query });

        const sum = result.data.maiar_exchange_analytics.metric[0].sum;

        return sum;
    }

    async getLatestHistoricData({
        series,
        key,
        startDate,
        endDate,
    }): Promise<HistoricDataModel[]> {
        const query = `query generic_query {
            maiar_exchange_analytics {
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

        const data = result.data.maiar_exchange_analytics['values'].map(
            (r) =>
                new HistoricDataModel({
                    timestamp: r.time,
                    value: r.value,
                }),
        );

        return data;
    }

    async getLatestBinnedHistoricData({
        series,
        key,
        startDate,
        endDate,
        resolution,
    }): Promise<HistoricDataModel[]> {
        const query = `query generic_query {
            maiar_exchange_analytics {
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

        const data = result.data.maiar_exchange_analytics['metric'].map(
            (r) =>
                new HistoricDataModel({
                    timestamp: r.time,
                    value: r.avg,
                }),
        );

        return data;
    }
}
