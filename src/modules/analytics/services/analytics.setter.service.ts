import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { oneMinute } from 'src/helpers/helpers';
import { CachingService } from 'src/services/caching/cache.service';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { generateSetLogMessage } from 'src/utils/generate-log-message';
import { Logger } from 'winston';
import { HistoricDataModel } from '../models/analytics.model';
import { AnalyticsQueryArgs } from '../models/query.args';

@Injectable()
export class AnalyticsSetterService {
    constructor(
        private readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
    ) {}

    private async setData<T>(
        cacheKey: string,
        value: T,
        methodName: string,
        remoteTTl = oneMinute() * 30,
        localTtl = oneMinute() * 10,
    ): Promise<string> {
        try {
            await this.cachingService.setCache<T>(
                cacheKey,
                value,
                remoteTTl,
                localTtl,
            );
            return cacheKey;
        } catch (error) {
            const logMessage = generateSetLogMessage(
                this.constructor.name,
                methodName,
                cacheKey,
                error.message,
            );
            this.logger.error(logMessage);
            throw error;
        }
    }

    async setLatestCompleteValues(
        series: string,
        metric: string,
        values: HistoricDataModel[],
    ): Promise<string> {
        const cacheKey = this.getAnalyticsCacheKey(
            'latestCompleteValues',
            series,
            metric,
        );
        return await this.setData(
            cacheKey,
            values,
            this.setLatestCompleteValues.name,
        );
    }

    async setSumCompleteValues(
        series: string,
        metric: string,
        values: HistoricDataModel[],
    ): Promise<string> {
        const cacheKey = this.getAnalyticsCacheKey(
            'sumCompleteValues',
            series,
            metric,
        );
        return await this.setData(
            cacheKey,
            values,
            this.setSumCompleteValues.name,
        );
    }

    async setValues24hSum(
        series: string,
        metric: string,
        values: HistoricDataModel[],
    ): Promise<string> {
        const cacheKey = this.getAnalyticsCacheKey(
            'values24hSum',
            series,
            metric,
        );
        return await this.setData(cacheKey, values, this.setValues24hSum.name);
    }

    async setValues24h(
        series: string,
        metric: string,
        values: HistoricDataModel[],
    ): Promise<string> {
        const cacheKey = this.getAnalyticsCacheKey('values24h', series, metric);
        return await this.setData(cacheKey, values, this.setValues24h.name);
    }

    async setLatestHistoricData(
        args: AnalyticsQueryArgs,
        values: HistoricDataModel[],
    ): Promise<string> {
        const cacheKey = this.getAnalyticsCacheKey(
            'latestHistoricData',
            args.series,
            args.metric,
            args.start,
            args.getEndTime(),
        );
        return await this.setData(
            cacheKey,
            values,
            this.setLatestHistoricData.name,
        );
    }

    async setLatestBinnedHistoricData(
        args: AnalyticsQueryArgs,
        values: HistoricDataModel[],
    ): Promise<string> {
        const cacheKey = this.getAnalyticsCacheKey(
            'latestBinnedHistoricData',
            args.series,
            args.metric,
            args.start,
            args.getEndTime(),
            args.getResolution(),
        );
        return await this.setData(
            cacheKey,
            values,
            this.setLatestBinnedHistoricData.name,
        );
    }

    private getAnalyticsCacheKey(...args: any) {
        return generateCacheKeyFromParams('analytics', ...args);
    }
}
