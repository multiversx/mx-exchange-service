import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { oneMinute } from 'src/helpers/helpers';
import { PairGetterService } from 'src/modules/pair/services/pair.getter.service';
import { CachingService } from 'src/services/caching/cache.service';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { generateGetLogMessage } from 'src/utils/generate-log-message';
import { Logger } from 'winston';
import { AnalyticsComputeService } from './analytics.compute.service';

@Injectable()
export class AnalyticsGetterService {
    constructor(
        private readonly contextGetter: ContextGetterService,
        private readonly cachingService: CachingService,
        private readonly analyticsCompute: AnalyticsComputeService,
        private readonly pairGetterService: PairGetterService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    private async getData(
        key: string,
        createValueFunc: () => any,
        ttl: number,
    ): Promise<any> {
        try {
            return await this.cachingService.getOrSet(
                key,
                createValueFunc,
                ttl,
            );
        } catch (error) {
            const logMessage = generateGetLogMessage(
                AnalyticsGetterService.name,
                this.getData.name,
                key,
                error.message,
            );
            this.logger.error(logMessage);
            throw error;
        }
    }

    async getTokenPriceUSD(tokenID: string): Promise<string> {
        return await this.pairGetterService.getTokenPriceUSD(tokenID);
    }

    async getTotalTokenSupply(tokenID: string): Promise<string> {
        const cacheKey = this.getAnalyticsCacheKey(tokenID, 'totalTokenSupply');
        return await this.getData(
            cacheKey,
            async () =>
                (await this.contextGetter.getTokenMetadata(tokenID)).supply,
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

    private getAnalyticsCacheKey(...args: any) {
        return generateCacheKeyFromParams('analytics', ...args);
    }
}
