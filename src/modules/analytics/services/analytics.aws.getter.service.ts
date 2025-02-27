import { Injectable } from '@nestjs/common';
import { generateCacheKeyFromParams } from '../../../utils/generate-cache-key';
import { CacheService } from 'src/services/caching/cache.service';
import { HistoricDataModel } from '../models/analytics.model';
import moment from 'moment';
import { ErrorLoggerAsync } from '@multiversx/sdk-nestjs-common';
import { parseCachedNullOrUndefined } from 'src/utils/cache.utils';

@Injectable()
export class AnalyticsAWSGetterService {
    constructor(private readonly cachingService: CacheService) {}

    private async getCachedData<T>(cacheKey: string): Promise<T> {
        const data = await this.cachingService.get<T>(cacheKey);
        if (!data || data === undefined) {
            return undefined;
        }
        return parseCachedNullOrUndefined(data);
    }

    @ErrorLoggerAsync()
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
        const data = await this.getCachedData<HistoricDataModel[]>(cacheKey);

        return this.filterDataByTimeWindow(data, start, time);
    }

    @ErrorLoggerAsync()
    async getSumCompleteValues(
        series: string,
        metric: string,
        start?: string,
        time?: string,
    ): Promise<HistoricDataModel[]> {
        const cacheKey = this.getAnalyticsCacheKey(
            'sumCompleteValues',
            series,
            metric,
        );
        const data = await this.getCachedData<HistoricDataModel[]>(cacheKey);

        return this.filterDataByTimeWindow(data, start, time);
    }

    private filterDataByTimeWindow(
        data: HistoricDataModel[],
        start?: string,
        time?: string,
    ): HistoricDataModel[] {
        if (data === undefined) {
            return [];
        }

        if (!start) {
            return data;
        }

        const formattedStart = moment.unix(parseInt(start)).utc();

        const result = data.filter((historicData) =>
            moment.utc(historicData.timestamp).isSameOrAfter(formattedStart),
        );

        if (!time) {
            return result;
        }

        const [timeAmount, timeUnit] = time.match(/[a-zA-Z]+|[0-9]+/g);
        const endDate = formattedStart.add(
            moment.duration(timeAmount, timeUnit as moment.unitOfTime.Base),
        );

        return result.filter((historicData) =>
            moment.utc(historicData.timestamp).isSameOrBefore(endDate),
        );
    }

    @ErrorLoggerAsync()
    async getValues24hSum(
        series: string,
        metric: string,
    ): Promise<HistoricDataModel[]> {
        const cacheKey = this.getAnalyticsCacheKey(
            'values24hSum',
            series,
            metric,
        );
        const data = await this.getCachedData<HistoricDataModel[]>(cacheKey);
        return data !== undefined ? data.slice(1) : [];
    }

    @ErrorLoggerAsync()
    async getValues24h(
        series: string,
        metric: string,
    ): Promise<HistoricDataModel[]> {
        const cacheKey = this.getAnalyticsCacheKey('values24h', series, metric);
        const data = await this.getCachedData<HistoricDataModel[]>(cacheKey);
        return data !== undefined ? data : [];
    }

    private getAnalyticsCacheKey(...args: any) {
        return generateCacheKeyFromParams('analytics', ...args);
    }
}
