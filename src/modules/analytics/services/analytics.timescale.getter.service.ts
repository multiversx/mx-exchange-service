import { Inject, Injectable } from '@nestjs/common';
import { generateCacheKeyFromParams } from '../../../utils/generate-cache-key';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { CachingService } from '../../../services/caching/cache.service';
import { HistoricDataModel } from '../models/analytics.model';
import { generateGetLogMessage } from 'src/utils/generate-log-message';

@Injectable()
export class AnalyticsTimescaleGetterService {
    constructor(
        protected readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
    ) {}

    private async getData<T>(cacheKey: string, methodName: string): Promise<T> {
        try {
            const data = await this.cachingService.getCache<T>(cacheKey);
            if (!data || data === undefined) {
                throw new Error(`Unavailable cached key ${cacheKey}`);
            }
            return data;
        } catch (error) {
            const logMessage = generateGetLogMessage(
                this.constructor.name,
                methodName,
                cacheKey,
                error.message,
            );
            this.logger.error(logMessage);
            throw error;
        }
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
        return await this.getData(cacheKey, this.getLatestCompleteValues.name);
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
        return await this.getData(cacheKey, this.getSumCompleteValues.name);
    }

    async getValues24hSum(
        series: string,
        key: string,
    ): Promise<HistoricDataModel[]> {
        const cacheKey = this.getAnalyticsCacheKey('values24hSum', series, key);
        return await this.getData(cacheKey, this.getValues24hSum.name);
    }

    async getValues24h(
        series: string,
        key: string,
    ): Promise<HistoricDataModel[]> {
        const cacheKey = this.getAnalyticsCacheKey('values24h', series, key);
        return await this.getData(cacheKey, this.getValues24h.name);
    }

    async getLatestHistoricData(
        series: string,
        key: string,
        startDate: string,
        endDate: string,
    ): Promise<HistoricDataModel[]> {
        const cacheKey = this.getAnalyticsCacheKey(
            'latestHistoricData',
            series,
            key,
            startDate,
            endDate,
        );
        return await this.getData(cacheKey, this.getLatestHistoricData.name);
    }

    async getLatestBinnedHistoricData(
        series: string,
        key: string,
        startDate: string,
        endDate: string,
        resolution: string = 'DAY',
    ): Promise<HistoricDataModel[]> {
        const cacheKey = this.getAnalyticsCacheKey(
            'latestBinnedHistoricData',
            series,
            key,
            startDate,
            endDate,
            resolution,
        );
        return await this.getData(
            cacheKey,
            this.getLatestBinnedHistoricData.name,
        );
    }

    private getAnalyticsCacheKey(...args: any) {
        return generateCacheKeyFromParams('analytics', ...args);
    }
}
