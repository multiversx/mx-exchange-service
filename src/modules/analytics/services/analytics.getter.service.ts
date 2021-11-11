import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { oneMinute } from 'src/helpers/helpers';
import { CachingService } from 'src/services/caching/cache.service';
import { ContextService } from 'src/services/context/context.service';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { generateGetLogMessage } from 'src/utils/generate-log-message';
import { Logger } from 'winston';
import { AnalyticsComputeService } from './analytics.compute.service';

@Injectable()
export class AnalyticsGetterService {
    constructor(
        private readonly context: ContextService,
        private readonly cachingService: CachingService,
        private readonly analyticsCompute: AnalyticsComputeService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    private async getData(
        key: string,
        createValueFunc: () => any,
        ttl: number,
    ): Promise<any> {
        const cacheKey = this.getAnalyticsCacheKey(key);
        try {
            return await this.cachingService.getOrSet(
                cacheKey,
                createValueFunc,
                ttl,
            );
        } catch (error) {
            const logMessage = generateGetLogMessage(
                AnalyticsGetterService.name,
                this.getData.name,
                cacheKey,
                error.message,
            );
            this.logger.error(logMessage);
            throw error;
        }
    }

    async getTokenPriceUSD(tokenID: string): Promise<string> {
        const cacheKey = this.getAnalyticsCacheKey(tokenID, 'tokenPriceUSD');
        return await this.getData(
            cacheKey,
            () => this.analyticsCompute.computeTokenPriceUSD(tokenID),
            oneMinute(),
        );
    }

    async getTotalTokenSupply(tokenID: string): Promise<string> {
        const cacheKey = this.getAnalyticsCacheKey(tokenID, 'totalTokenSupply');
        return await this.getData(
            cacheKey,
            async () => (await this.context.getTokenMetadata(tokenID)).supply,
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

    private getAnalyticsCacheKey(...args: any) {
        return generateCacheKeyFromParams('analytics', ...args);
    }
}
