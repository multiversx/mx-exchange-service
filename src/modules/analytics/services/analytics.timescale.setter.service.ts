import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { oneMinute } from 'src/helpers/helpers';
import { CachingService } from 'src/services/caching/cache.service';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { generateSetLogMessage } from 'src/utils/generate-log-message';
import { Logger } from 'winston';
import { HistoricDataModel } from '../models/analytics.model';

@Injectable()
export class AnalyticsTimescaleSetterService {
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
        key: string,
        values: HistoricDataModel[],
    ): Promise<string> {
        const cacheKey = this.getAnalyticsCacheKey(
            'latestCompleteValues',
            series,
            key,
        );
        return await this.setData(
            cacheKey,
            values,
            this.setLatestCompleteValues.name,
        );
    }

    async setSumCompleteValues(
        series: string,
        key: string,
        values: HistoricDataModel[],
    ): Promise<string> {
        const cacheKey = this.getAnalyticsCacheKey(
            'sumCompleteValues',
            series,
            key,
        );
        return await this.setData(
            cacheKey,
            values,
            this.setSumCompleteValues.name,
        );
    }

    async setValues24hSum(
        series: string,
        key: string,
        values: HistoricDataModel[],
    ): Promise<string> {
        const cacheKey = this.getAnalyticsCacheKey('values24hSum', series, key);
        return await this.setData(cacheKey, values, this.setValues24hSum.name);
    }

    async setValues24h(
        series: string,
        key: string,
        values: HistoricDataModel[],
    ): Promise<string> {
        const cacheKey = this.getAnalyticsCacheKey('values24h', series, key);
        return await this.setData(cacheKey, values, this.setValues24h.name);
    }

    async setLatestHistoricData(
        series: string,
        key: string,
        startDate: string,
        endDate: string,
        values: HistoricDataModel[],
    ): Promise<string> {
        const cacheKey = this.getAnalyticsCacheKey(
            'latestHistoricData',
            series,
            key,
            startDate,
            endDate,
        );
        return await this.setData(
            cacheKey,
            values,
            this.setLatestHistoricData.name,
        );
    }

    async setLatestBinnedHistoricData(
        series: string,
        key: string,
        startDate: string,
        endDate: string,
        resolution: string = 'DAY',
        values: HistoricDataModel[],
    ): Promise<string> {
        const cacheKey = this.getAnalyticsCacheKey(
            'latestBinnedHistoricData',
            series,
            key,
            startDate,
            endDate,
            resolution,
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
