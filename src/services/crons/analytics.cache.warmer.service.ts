import { Inject, Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { CachingService } from '../caching/cache.service';
import { cacheConfig, constantsConfig, tokensSupplyConfig } from 'src/config';
import { AnalyticsComputeService } from 'src/modules/analytics/services/analytics.compute.service';
import { AnalyticsGetterService } from 'src/modules/analytics/services/analytics.getter.service';
import { oneMinute } from '../../helpers/helpers';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { PUB_SUB } from '../redis.pubSub.module';

@Injectable()
export class AnalyticsCacheWarmerService {
    private invalidatedKeys = [];

    constructor(
        private readonly analyticsGetterService: AnalyticsGetterService,
        private readonly analyticsCompute: AnalyticsComputeService,
        private readonly cachingService: CachingService,
        @Inject(PUB_SUB) private pubSub: RedisPubSub,
    ) {}

    @Cron(CronExpression.EVERY_MINUTE)
    async cacheAnalytics(): Promise<void> {
        for (const token of tokensSupplyConfig) {
            await this.analyticsGetterService.getTotalTokenSupply(token);
        }
        const [
            totalValueLockedUSD,
            totalAggregatedRewards,
            totalValueLockedUSDFarms,
        ] = await Promise.all([
            this.analyticsCompute.computeTotalValueLockedUSD(),
            this.analyticsCompute.computeTotalAggregatedRewards(30),
            this.analyticsCompute.computeLockedValueUSDFarms(),
        ]);
        await Promise.all([
            this.setAnalyticsCache(
                ['totalValueLockedUSD'],
                totalValueLockedUSD,
                oneMinute() * 2,
            ),
            this.setAnalyticsCache(
                [30, 'totalAggregatedRewards'],
                totalAggregatedRewards,
                oneMinute() * 2,
            ),
            this.setAnalyticsCache(
                ['lockedValueUSDFarms'],
                totalValueLockedUSDFarms,
                oneMinute() * 2,
            ),
        ]);

        await this.deleteCacheKeys();
    }

    @Cron(CronExpression.EVERY_5_MINUTES)
    async cacheBurnedTokens(): Promise<void> {
        const [feeBurned, penaltyBurned] = await Promise.all([
            this.analyticsCompute.computeTokenBurned(
                constantsConfig.MEX_TOKEN_ID,
                '365d',
                'feeBurned',
            ),
            this.analyticsCompute.computeTokenBurned(
                constantsConfig.MEX_TOKEN_ID,
                '365d',
                'penaltyBurned',
            ),
        ]);

        await Promise.all([
            this.setAnalyticsCache(
                [constantsConfig.MEX_TOKEN_ID, '365d', 'feeTokenBurned'],
                feeBurned,
                oneMinute() * 10,
            ),
            this.setAnalyticsCache(
                [constantsConfig.MEX_TOKEN_ID, '365d', 'penaltyTokenBurned'],
                penaltyBurned,
                oneMinute() * 10,
            ),
        ]);
        await this.deleteCacheKeys();
    }

    private async setAnalyticsCache(
        keys: any[],
        value: any,
        ttl: number = cacheConfig.default,
    ) {
        const cacheKey = generateCacheKeyFromParams('analytics', ...keys);
        await this.cachingService.setCache(cacheKey, value, ttl);
        this.invalidatedKeys.push(cacheKey);
    }

    private async deleteCacheKeys() {
        await this.pubSub.publish('deleteCacheKeys', this.invalidatedKeys);
        this.invalidatedKeys = [];
    }
}
