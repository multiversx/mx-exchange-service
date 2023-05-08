import { Injectable } from '@nestjs/common';
import { generateCacheKeyFromParams } from '../../../utils/generate-cache-key';
import { CachingService } from '../../../services/caching/cache.service';
import { HistoricDataModel } from '../models/analytics.model';
import { oneMinute } from 'src/helpers/helpers';
import { AnalyticsQueryService } from 'src/services/analytics/services/analytics.query.service';
import { ApiConfigService } from 'src/helpers/api.config.service';
import moment from 'moment';
import { ErrorLoggerAsync } from 'src/helpers/decorators/error.logger';
import { GetOrSetCache } from 'src/helpers/decorators/caching.decorator';

@Injectable()
export class AnalyticsAWSGetterService {
    constructor(
        protected readonly cachingService: CachingService,
        private readonly analyticsQuery: AnalyticsQueryService,
        private readonly apiConfig: ApiConfigService,
    ) {}

    private async getCachedData<T>(cacheKey: string): Promise<T> {
        const data = await this.cachingService.getCache<T>(cacheKey);
        if (!data || data === undefined) {
            throw new Error(`Unavailable cached key ${cacheKey}`);
        }
        return data;
    }

    @ErrorLoggerAsync({
        className: AnalyticsAWSGetterService.name,
    })
    async getLatestCompleteValues(
        series: string,
        metric: string,
        start?: string,
        time?: string,
    ): Promise<HistoricDataModel[]> {
        const cacheKey = this.getAnalyticsCacheKey(
            'latestCompleteValues',
            series,
            metric,
        );
        let data = await this.getCachedData<HistoricDataModel[]>(cacheKey);
        if (start) {
            const formattedStart = moment.unix(parseInt(start)).utc();

            data = data.filter((historicData) =>
                moment
                    .utc(historicData.timestamp)
                    .isSameOrAfter(formattedStart),
            );

            if (time) {
                const [timeAmount, timeUnit] = time.match(/[a-zA-Z]+|[0-9]+/g);
                const endDate = formattedStart.add(
                    moment.duration(
                        timeAmount,
                        timeUnit as moment.unitOfTime.Base,
                    ),
                );
                data = data.filter((historicData) =>
                    moment.utc(historicData.timestamp).isSameOrBefore(endDate),
                );
            }
        }

        return data;
    }

    @ErrorLoggerAsync({
        className: AnalyticsAWSGetterService.name,
    })
    async getSumCompleteValues(
        series: string,
        metric: string,
    ): Promise<HistoricDataModel[]> {
        const cacheKey = this.getAnalyticsCacheKey(
            'sumCompleteValues',
            series,
            metric,
        );
        return await this.getCachedData(cacheKey);
    }

    @ErrorLoggerAsync({
        className: AnalyticsAWSGetterService.name,
    })
    async getValues24hSum(
        series: string,
        metric: string,
    ): Promise<HistoricDataModel[]> {
        const cacheKey = this.getAnalyticsCacheKey(
            'values24hSum',
            series,
            metric,
        );
        return await this.getCachedData(cacheKey);
    }

    @ErrorLoggerAsync({
        className: AnalyticsAWSGetterService.name,
    })
    async getValues24h(
        series: string,
        metric: string,
    ): Promise<HistoricDataModel[]> {
        const cacheKey = this.getAnalyticsCacheKey('values24h', series, metric);
        return await this.getCachedData(cacheKey);
    }

    @ErrorLoggerAsync({
        className: AnalyticsAWSGetterService.name,
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'analytics',
        remoteTtl: oneMinute() * 2,
    })
    async latestHistoricData(
        time: string,
        series: string,
        metric: string,
        start: string,
    ): Promise<HistoricDataModel[]> {
        if (!this.apiConfig.isAWSTimestreamRead()) {
            return [];
        }

        return await this.analyticsQuery.getLatestHistoricData({
            series,
            metric,
            time,
            start,
        });
    }

    @ErrorLoggerAsync({
        className: AnalyticsAWSGetterService.name,
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'analytics',
        remoteTtl: oneMinute() * 2,
    })
    async latestBinnedHistoricData(
        time: string,
        series: string,
        metric: string,
        bin: string,
        start: string,
    ): Promise<HistoricDataModel[]> {
        if (!this.apiConfig.isAWSTimestreamRead()) {
            return [];
        }

        return await this.analyticsQuery.getLatestBinnedHistoricData({
            series,
            metric,
            time,
            start,
            bin,
        });
    }

    private getAnalyticsCacheKey(...args: any) {
        return generateCacheKeyFromParams('analytics', ...args);
    }
}
