import { Inject, Injectable } from '@nestjs/common';
import { elrondData } from 'src/config';
//import { awsConfig, elrondData } from 'src/config';
import { generateCacheKeyFromParams } from '../../../utils/generate-cache-key';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { CachingService } from '../../../services/caching/cache.service';
import { nowUtc, oneMinute } from '../../../helpers/helpers';
import { HistoricDataModel } from '../models/analytics.model';
import { GenericGetterService } from 'src/services/generics/generic.getter.service';
import { ElrondDataService } from 'src/services/elrond-communication/services/elrond-data.service';

@Injectable()
export class AnalyticsAWSGetterService extends GenericGetterService {
    constructor(
        protected readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
        private readonly elrondDataService: ElrondDataService,
    ) {
        super(cachingService, logger);
    }

    async getHistoricData(
        series: string,
        key: string,
        startTimeUtc: string,
    ): Promise<HistoricDataModel[]> {
        const cacheKey = this.getAnalyticsCacheKey(
            'historicData',
            series,
            key,
            startTimeUtc,
        );
        return await this.getData(
            cacheKey,
            () =>
                // this.awsTimestreamQuery.getValues({
                //     table: awsConfig.timestream.tableName,
                //     series,
                //     metric,
                //     time,
                // }),
                this.elrondDataService.getAggregatedValue({
                    table: elrondData.timestream.tableName,
                    series,
                    key,
                    startTimeUtc,
                }),
            oneMinute() * 5,
        );
    }

    async getClosingValue(
        series: string,
        key: string,
        time: string,
    ): Promise<string> {
        const cacheKey = this.getAnalyticsCacheKey(
            'closingValue',
            series,
            key,
            time,
        );
        return await this.getData(
            cacheKey,
            () =>
                // this.awsTimestreamQuery.getClosingValue({
                //     table: awsConfig.timestream.tableName,
                //     series,
                //     metric,
                //     time,
                // }),
                this.elrondDataService.getClosingValue({
                    table: elrondData.timestream.tableName,
                    series,
                    key,
                    time,
                }),
            oneMinute() * 5,
        );
    }

    async getCompleteValues(
        series: string,
        key: string,
    ): Promise<HistoricDataModel[]> {
        const cacheKey = this.getAnalyticsCacheKey(
            'completeValues',
            series,
            key,
        );
        return await this.getData(
            cacheKey,
            () =>
                // this.awsTimestreamQuery.getCompleteValues({
                //     table: awsConfig.timestream.tableName,
                //     series,
                //     metric,
                // }),
                this.elrondDataService.getCompleteValues({
                    table: elrondData.timestream.tableName,
                    series,
                    key,
                }),
            oneMinute() * 5,
        );
    }

    async getLatestCompleteValues(
        series: string,
        key: string,
    ): Promise<HistoricDataModel[]> {
        const cacheKey = this.getAnalyticsCacheKey(
            'latestCompleteValues',
            series,
            key,
        );
        return await this.getData(
            cacheKey,
            () =>
                // this.awsTimestreamQuery.getLatestCompleteValues({
                //     table: awsConfig.timestream.tableName,
                //     series,
                //     metric,
                // }),
                this.elrondDataService.getLatestCompleteValues({
                    table: elrondData.timestream.tableName,
                    series,
                    key,
                }),
            oneMinute() * 5,
        );
    }

    async getSumCompleteValues(
        series: string,
        key: string,
    ): Promise<HistoricDataModel[]> {
        const cacheKey = this.getAnalyticsCacheKey(
            'sumCompleteValues',
            series,
            key,
        );
        return await this.getData(
            cacheKey,
            () =>
                // this.awsTimestreamQuery.getSumCompleteValues({
                //     table: awsConfig.timestream.tableName,
                //     series,
                //     metric,
                // }),
                this.elrondDataService.getSumCompleteValues({
                    table: elrondData.timestream.tableName,
                    series,
                    key,
                }),
            oneMinute() * 5,
        );
    }

    async getLatestValues(
        series: string,
        key: string,
    ): Promise<HistoricDataModel[]> {
        const cacheKey = this.getAnalyticsCacheKey('latestValues', series, key);
        return await this.getData(
            cacheKey,
            () =>
                // this.awsTimestreamQuery.getLatestValues({
                //     table: awsConfig.timestream.tableName,
                //     series,
                //     metric,
                // }),
                this.elrondDataService.getLatestValues({
                    table: elrondData.timestream.tableName,
                    series,
                    key,
                }),
            oneMinute() * 5,
        );
    }

    async getMarketValues(
        series: string,
        key: string,
    ): Promise<HistoricDataModel[]> {
        const cacheKey = this.getAnalyticsCacheKey('marketValues', series, key);
        return await this.getData(
            cacheKey,
            () =>
                // this.awsTimestreamQuery.getMarketValues({
                //     table: awsConfig.timestream.tableName,
                //     series,
                //     metric,
                // }),
                this.elrondDataService.getMarketValues({
                    table: elrondData.timestream.tableName,
                    series,
                    key,
                }),
            oneMinute() * 5,
        );
    }

    async getMarketCompleteValues(
        series: string,
        key: string,
    ): Promise<HistoricDataModel[]> {
        const cacheKey = this.getAnalyticsCacheKey(
            'marketCompleteValues',
            series,
            key,
        );
        return await this.getData(
            cacheKey,
            () =>
                // this.awsTimestreamQuery.getMarketCompleteValues({
                //     table: awsConfig.timestream.tableName,
                //     series,
                //     metric,
                // }),
                this.elrondDataService.getMarketCompleteValues({
                    table: elrondData.timestream.tableName,
                    series,
                    key,
                }),
            oneMinute() * 5,
        );
    }

    async getValues24hSum(
        series: string,
        key: string,
    ): Promise<HistoricDataModel[]> {
        const cacheKey = this.getAnalyticsCacheKey('values24hSum', series, key);
        return await this.getData(
            cacheKey,
            () =>
                // this.awsTimestreamQuery.getValues24hSum({
                //     table: awsConfig.timestream.tableName,
                //     series,
                //     metric,
                // }),
                this.elrondDataService.getValues24hSum({
                    table: elrondData.timestream.tableName,
                    series,
                    key,
                }),
            oneMinute() * 5,
        );
    }

    async getValues24h(
        series: string,
        key: string,
    ): Promise<HistoricDataModel[]> {
        const cacheKey = this.getAnalyticsCacheKey('values24h', series, key);
        return await this.getData(
            cacheKey,
            () =>
                // this.awsTimestreamQuery.getValues24h({
                //     table: awsConfig.timestream.tableName,
                //     series,
                //     metric,
                // }),
                this.elrondDataService.getValues24h({
                    table: elrondData.timestream.tableName,
                    series,
                    key,
                }),
            oneMinute() * 5,
        );
    }

    async getLatestHistoricData(
        time: string,
        series: string,
        key: string,
        startDate: string,
    ): Promise<HistoricDataModel[]> {
        const cacheKey = this.getAnalyticsCacheKey(
            'latestHistoricData',
            time,
            series,
            key,
            startDate,
        );
        return await this.getData(
            cacheKey,
            () =>
                // this.awsTimestreamQuery.getLatestHistoricData({
                //     table: awsConfig.timestream.tableName,
                //     time,
                //     series,
                //     metric,
                //     start,
                // }),
                this.elrondDataService.getLatestHistoricData({
                    table: elrondData.timestream.tableName,
                    series,
                    key,
                    startDate,
                    endDate: nowUtc(),
                }),
            oneMinute(),
        );
    }

    async getLatestBinnedHistoricData(
        time: string,
        series: string,
        key: string,
        startDate: string,
        endDate: string,
        resolution: string = 'DAY',
    ): Promise<HistoricDataModel[]> {
        const cacheKey = this.getAnalyticsCacheKey(
            'latestBinnedHistoricData',
            time,
            series,
            key,
            startDate,
            endDate,
            resolution,
        );
        return await this.getData(
            cacheKey,
            () =>
                // this.awsTimestreamQuery.getLatestBinnedHistoricData({
                //     table: awsConfig.timestream.tableName,
                //     time,
                //     series,
                //     metric,
                //     bin,
                //     start,
                // }),
                this.elrondDataService.getLatestBinnedHistoricData({
                    table: elrondData.timestream.tableName,
                    series,
                    key,
                    startDate,
                    endDate,
                    resolution,
                }),
            oneMinute(),
        );
    }

    private getAnalyticsCacheKey(...args: any) {
        return generateCacheKeyFromParams('analytics', ...args);
    }
}
