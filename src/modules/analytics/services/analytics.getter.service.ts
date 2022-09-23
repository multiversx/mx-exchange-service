import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { oneMinute } from 'src/helpers/helpers';
import { PairGetterService } from 'src/modules/pair/services/pair.getter.service';
import { TokenGetterService } from 'src/modules/tokens/services/token.getter.service';
import { CachingService } from 'src/services/caching/cache.service';
import { GenericGetterService } from 'src/services/generics/generic.getter.service';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { generateGetLogMessage } from 'src/utils/generate-log-message';
import { Logger } from 'winston';
import { HistoricDataModel } from '../models/analytics.model';
import { AnalyticsQueryArgs } from '../models/analytics.query.args';
import { AnalyticsComputeService } from './analytics.compute.service';

@Injectable()
export class AnalyticsGetterService extends GenericGetterService {
    constructor(
        protected readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
        private readonly tokenGetter: TokenGetterService,
        private readonly analyticsCompute: AnalyticsComputeService,
        private readonly pairGetterService: PairGetterService,
    ) {
        super(cachingService, logger);
    }

    async getTokenPriceUSD(tokenID: string): Promise<string> {
        return await this.pairGetterService.getTokenPriceUSD(tokenID);
    }

    async getTotalTokenSupply(tokenID: string): Promise<string> {
        const cacheKey = this.getAnalyticsCacheKey(tokenID, 'totalTokenSupply');
        return await this.getData(
            cacheKey,
            async () =>
                (
                    await this.tokenGetter.getTokenMetadata(tokenID)
                ).supply,
            oneMinute(),
        );
    }

    async getTotalValueLockedUSD(): Promise<string> {
        const cacheKey = this.getAnalyticsCacheKey('totalValueLockedUSD');
        return await this.getData(
            cacheKey,
            () => this.analyticsCompute.computeTotalValueLockedUSD(),
            oneMinute() * 2,
        );
    }

    async getLockedValueUSDFarms(): Promise<string> {
        const cacheKey = this.getAnalyticsCacheKey('lockedValueUSDFarms');
        return await this.getData(
            cacheKey,
            () => this.analyticsCompute.computeLockedValueUSDFarms(),
            oneMinute() * 2,
        );
    }

    async getTotalAggregatedRewards(days: number): Promise<string> {
        const cacheKey = this.getAnalyticsCacheKey(
            days,
            'totalAggregatedRewards',
        );
        return this.getData(
            cacheKey,
            () => this.analyticsCompute.computeTotalAggregatedRewards(days),
            oneMinute() * 2,
        );
    }

    async getFeeTokenBurned(tokenID: string, time: string): Promise<string> {
        const cacheKey = this.getAnalyticsCacheKey(
            tokenID,
            time,
            'feeTokenBurned',
        );
        return await this.getData(
            cacheKey,
            () =>
                this.analyticsCompute.computeTokenBurned(
                    tokenID,
                    time,
                    'feeBurned',
                ),
            oneMinute() * 10,
        );
    }

    async getPenaltyTokenBurned(
        tokenID: string,
        time: string,
    ): Promise<string> {
        const cacheKey = this.getAnalyticsCacheKey(
            tokenID,
            time,
            'penaltyTokenBurned',
        );
        return await this.getData(
            cacheKey,
            () =>
                this.analyticsCompute.computeTokenBurned(
                    tokenID,
                    time,
                    'penaltyBurned',
                ),
            oneMinute() * 10,
        );
    }

    private async getCachedData<T>(
        cacheKey: string,
        methodName: string,
    ): Promise<T> {
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
        return await this.getCachedData(
            cacheKey,
            this.getLatestCompleteValues.name,
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
        return await this.getCachedData(
            cacheKey,
            this.getSumCompleteValues.name,
        );
    }

    async getValues24hSum(
        series: string,
        key: string,
    ): Promise<HistoricDataModel[]> {
        const cacheKey = this.getAnalyticsCacheKey('values24hSum', series, key);
        return await this.getCachedData(cacheKey, this.getValues24hSum.name);
    }

    async getValues24h(
        series: string,
        key: string,
    ): Promise<HistoricDataModel[]> {
        const cacheKey = this.getAnalyticsCacheKey('values24h', series, key);
        return await this.getCachedData(cacheKey, this.getValues24h.name);
    }

    async getLatestHistoricData(
        args: AnalyticsQueryArgs,
    ): Promise<HistoricDataModel[]> {
        const cacheKey = this.getAnalyticsCacheKey(
            'latestHistoricData',
            args.series,
            args.metric,
            args.start,
            args.getEndTime(),
        );
        return await this.getCachedData(
            cacheKey,
            this.getLatestHistoricData.name,
        );
    }

    async getLatestBinnedHistoricData(
        args: AnalyticsQueryArgs,
    ): Promise<HistoricDataModel[]> {
        const cacheKey = this.getAnalyticsCacheKey(
            'latestBinnedHistoricData',
            args.series,
            args.metric,
            args.start,
            args.getEndTime(),
            args.getResolution(),
        );
        return await this.getCachedData(
            cacheKey,
            this.getLatestBinnedHistoricData.name,
        );
    }

    private getAnalyticsCacheKey(...args: any) {
        return generateCacheKeyFromParams('analytics', ...args);
    }
}
