import { Inject, Injectable } from '@nestjs/common';
import { generateCacheKeyFromParams } from '../../../utils/generate-cache-key';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { CachingService } from '../../../services/caching/cache.service';
import { HistoricDataModel } from '../models/analytics.model';
import { generateGetLogMessage } from 'src/utils/generate-log-message';

@Injectable()
export class AnalyticsAWSGetterService {
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

    async getHistoricData(
        series: string,
        metric: string,
        time: string,
    ): Promise<HistoricDataModel[]> {
        const cacheKey = this.getAnalyticsCacheKey(
            'historicData',
            series,
            metric,
            time,
        );
        return await this.getData(cacheKey, this.getHistoricData.name);
    }

    async getClosingValue(
        series: string,
        metric: string,
        time: string,
    ): Promise<string> {
        const cacheKey = this.getAnalyticsCacheKey(
            'closingValue',
            series,
            metric,
            time,
        );
        return await this.getData(cacheKey, this.getClosingValue.name);
    }

    async getCompleteValues(
        series: string,
        metric: string,
    ): Promise<HistoricDataModel[]> {
        const cacheKey = this.getAnalyticsCacheKey(
            'completeValues',
            series,
            metric,
        );
        return await this.getData(cacheKey, this.getCompleteValues.name);
    }

    async getLatestCompleteValues(
        series: string,
        metric: string,
    ): Promise<HistoricDataModel[]> {
        const cacheKey = this.getAnalyticsCacheKey(
            'latestCompleteValues',
            series,
            metric,
        );
        return await this.getData(cacheKey, this.getLatestCompleteValues.name);
    }

    async getSumCompleteValues(
        series: string,
        metric: string,
    ): Promise<HistoricDataModel[]> {
        const cacheKey = this.getAnalyticsCacheKey(
            'sumCompleteValues',
            series,
            metric,
        );
        return await this.getData(cacheKey, this.getSumCompleteValues.name);
    }

    async getLatestValues(
        series: string,
        metric: string,
    ): Promise<HistoricDataModel[]> {
        const cacheKey = this.getAnalyticsCacheKey(
            'latestValues',
            series,
            metric,
        );
        return await this.getData(cacheKey, this.getLatestValues.name);
    }

    async getMarketValues(
        series: string,
        metric: string,
    ): Promise<HistoricDataModel[]> {
        const cacheKey = this.getAnalyticsCacheKey(
            'marketValues',
            series,
            metric,
        );
        return await this.getData(cacheKey, this.getMarketValues.name);
    }

    async getMarketCompleteValues(
        series: string,
        metric: string,
    ): Promise<HistoricDataModel[]> {
        const cacheKey = this.getAnalyticsCacheKey(
            'marketCompleteValues',
            series,
            metric,
        );
        return await this.getData(cacheKey, this.getMarketCompleteValues.name);
    }

    async getValues24hSum(
        series: string,
        metric: string,
    ): Promise<HistoricDataModel[]> {
        const cacheKey = this.getAnalyticsCacheKey(
            'values24hSum',
            series,
            metric,
        );
        return await this.getData(cacheKey, this.getValues24hSum.name);
    }

    async getValues24h(
        series: string,
        metric: string,
    ): Promise<HistoricDataModel[]> {
        const cacheKey = this.getAnalyticsCacheKey('values24h', series, metric);
        return await this.getData(cacheKey, this.getValues24h.name);
    }

    async getLatestHistoricData(
        time: string,
        series: string,
        metric: string,
        start: string,
    ): Promise<HistoricDataModel[]> {
        const cacheKey = this.getAnalyticsCacheKey(
            'latestHistoricData',
            time,
            series,
            metric,
            start,
        );
        return await this.getData(cacheKey, this.getLatestHistoricData.name);
    }

    async getLatestBinnedHistoricData(
        time: string,
        series: string,
        metric: string,
        bin: string,
        start: string,
    ): Promise<HistoricDataModel[]> {
        const cacheKey = this.getAnalyticsCacheKey(
            'latestBinnedHistoricData',
            time,
            series,
            metric,
            bin,
            start,
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
