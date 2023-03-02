import {
    AggregateValue,
    DataApiClient,
    DataApiQueryBuilder,
    HistoricalValue,
    TimeRange,
    TimeResolution,
} from '@multiversx/sdk-data-api-client';
import {
    DataApiAggregateQuery,
    DataApiHistoricalQuery,
} from '@multiversx/sdk-data-api-client/lib/src/queries';
import {
    DataApiAggregateResponse,
    DataApiHistoricalResponse,
} from '@multiversx/sdk-data-api-client/lib/src/responses';
import { Inject, Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import fs from 'fs';
import moment from 'moment';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { mxConfig } from 'src/config';
import { ApiConfigService } from 'src/helpers/api.config.service';
import { HistoricDataModel } from 'src/modules/analytics/models/analytics.model';
import {
    computeTimeInterval,
    convertBinToTimeResolution,
    DataApiQuery,
} from 'src/utils/analytics.utils';
import { PendingExecutor } from 'src/utils/pending.executor';
import { Logger } from 'winston';
import { AnalyticsQueryArgs } from '../entities/analytics.query.args';
import { AnalyticsQueryInterface } from '../interfaces/analytics.query.interface';

@Injectable()
export class DataApiQueryService implements AnalyticsQueryInterface {
    private readonly dataApiClient: DataApiClient;
    private readonly historicalQueryExecutor: PendingExecutor<
        DataApiHistoricalQuery,
        DataApiHistoricalResponse[]
    >;
    private readonly rawQueryExecutor: PendingExecutor<any, any>;
    private readonly aggregateQueryExecutor: PendingExecutor<
        DataApiAggregateQuery,
        DataApiAggregateResponse
    >;

    constructor(
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
        private readonly apiConfigService: ApiConfigService,
    ) {
        this.dataApiClient = new DataApiClient({
            host: 'dex-service',
            dataApiUrl: process.env.ELRONDDATAAPI_URL,
            multiversXApiUrl: this.apiConfigService.getApiUrl(),
            proxyTimeout: mxConfig.proxyTimeout,
            keepAlive: {
                maxSockets: mxConfig.keepAliveMaxSockets,
                maxFreeSockets: mxConfig.keepAliveMaxFreeSockets,
                timeout: this.apiConfigService.getKeepAliveTimeoutDownstream(),
                freeSocketTimeout: mxConfig.keepAliveFreeSocketTimeout,
            },
            signerPrivateKey: fs
                .readFileSync(this.apiConfigService.getNativeAuthKeyPath())
                .toString(),
        });

        this.historicalQueryExecutor = new PendingExecutor((query) =>
            this.dataApiClient.executeHistoricalQuery(query),
        );
        this.rawQueryExecutor = new PendingExecutor((query) =>
            this.dataApiClient.executeRawQuery(query),
        );
        this.aggregateQueryExecutor = new PendingExecutor((query) =>
            this.dataApiClient.executeAggregateQuery(query),
        );
    }

    @DataApiQuery()
    async getAggregatedValue({
        series,
        metric,
        time,
    }: AnalyticsQueryArgs): Promise<string> {
        const [startDate, endDate] = computeTimeInterval(time);

        const query = DataApiQueryBuilder.createXExchangeAnalyticsQuery()
            .metric(series, metric)
            .betweenDates(startDate, endDate)
            .getAggregate(AggregateValue.sum);

        const data = await this.aggregateQueryExecutor.execute(query);

        const value = new BigNumber(data?.sum ?? '0').toFixed();
        return value;
    }

    @DataApiQuery()
    async getLatestCompleteValues({
        series,
        metric,
    }: AnalyticsQueryArgs): Promise<HistoricDataModel[]> {
        const query = DataApiQueryBuilder.createXExchangeAnalyticsQuery()
            .metric(series, metric)
            .withTimeRange(TimeRange.ALL)
            .withTimeResolution(TimeResolution.INTERVAL_DAY)
            .getHistorical(HistoricalValue.last, HistoricalValue.time);

        const rows = await this.historicalQueryExecutor.execute(query);

        const data = rows.map((row) =>
            HistoricDataModel.fromDataApiResponse(row, HistoricalValue.last),
        );
        return data;
    }

    @DataApiQuery()
    async getSumCompleteValues({
        series,
        metric,
    }: AnalyticsQueryArgs): Promise<HistoricDataModel[]> {
        const query = DataApiQueryBuilder.createXExchangeAnalyticsQuery()
            .metric(series, metric)
            .withTimeRange(TimeRange.ALL)
            .withTimeResolution(TimeResolution.INTERVAL_DAY)
            .fillDataGaps()
            .getHistorical(HistoricalValue.sum, HistoricalValue.time);

        const rows = await this.historicalQueryExecutor.execute(query);

        const data = rows.map((row) =>
            HistoricDataModel.fromDataApiResponse(row, HistoricalValue.sum),
        );
        return data;
    }

    @DataApiQuery()
    async getValues24h({
        series,
        metric,
    }: AnalyticsQueryArgs): Promise<HistoricDataModel[]> {
        const query = DataApiQueryBuilder.createXExchangeAnalyticsQuery()
            .metric(series, metric)
            .withTimeRange(TimeRange.DAY)
            .withTimeResolution(TimeResolution.INTERVAL_HOUR)
            .getHistorical(HistoricalValue.last, HistoricalValue.time);

        const rows = await this.historicalQueryExecutor.execute(query);

        const data = rows.map((row) =>
            HistoricDataModel.fromDataApiResponse(row, HistoricalValue.last),
        );
        return data;
    }

    @DataApiQuery()
    async getValues24hSum({
        series,
        metric,
    }: AnalyticsQueryArgs): Promise<HistoricDataModel[]> {
        const query = DataApiQueryBuilder.createXExchangeAnalyticsQuery()
            .metric(series, metric)
            .withTimeRange(TimeRange.DAY)
            .withTimeResolution(TimeResolution.INTERVAL_HOUR)
            .fillDataGaps()
            .getHistorical(HistoricalValue.sum, HistoricalValue.time);

        const rows = await this.historicalQueryExecutor.execute(query);

        const data = rows.map((row) =>
            HistoricDataModel.fromDataApiResponse(row, HistoricalValue.sum),
        );
        return data;
    }

    @DataApiQuery()
    async getLatestHistoricData({
        time,
        series,
        metric,
        start,
    }: AnalyticsQueryArgs): Promise<HistoricDataModel[]> {
        const [startDate, endDate] = computeTimeInterval(time, start);

        const query = `query getLatestHistoricData($series: String!, $metric: String!, $startDate: DateTime!, $endDate: DateTime!) {
            xExchangeAnalytics {
                values(series: $series, key: $metric, filter: {
                    sort: ASC, start_date: $startDate, end_date: $endDate
                }) {
                    value
                    time
                }
            }
        }`;

        const variables = {
            series,
            metric,
            startDate: moment.utc(startDate).format('YYYY-MM-DD HH:mm:ss'),
            endDate: moment.utc(endDate).format('YYYY-MM-DD HH:mm:ss'),
        };

        const response = await this.rawQueryExecutor.execute({
            query,
            variables,
        });
        const rows = response.xExchangeAnalytics.values;

        const data = rows.map(
            (row: any) =>
                new HistoricDataModel({
                    timestamp: moment.utc(row.time).unix().toString(),
                    value: new BigNumber(row.value ?? '0').toFixed(),
                }),
        );
        return data;
    }

    @DataApiQuery()
    async getLatestBinnedHistoricData({
        time,
        series,
        metric,
        start,
        bin,
    }: AnalyticsQueryArgs): Promise<HistoricDataModel[]> {
        const [startDate, endDate] = computeTimeInterval(time, start);
        const timeResolution = convertBinToTimeResolution(bin);

        const query = DataApiQueryBuilder.createXExchangeAnalyticsQuery()
            .metric(series, metric)
            .betweenDates(startDate, endDate)
            .withTimeResolution(timeResolution)
            .fillDataGaps()
            .getHistorical(HistoricalValue.avg, HistoricalValue.time);

        const rows = await this.historicalQueryExecutor.execute(query);

        const data = rows.map((row) =>
            HistoricDataModel.fromDataApiResponse(row, HistoricalValue.max),
        );
        return data;
    }
}
