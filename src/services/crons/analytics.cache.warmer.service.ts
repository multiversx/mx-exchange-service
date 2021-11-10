import { Inject, Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { CachingService } from '../caching/cache.service';
import {
    cacheConfig,
    cachedTokensPriceConfig,
    farmsConfig,
    tokensSupplyConfig,
} from 'src/config';
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
        for (const farmAddress of farmsConfig) {
            const farmLockedValueUSD = await this.analyticsCompute.computeFarmLockedValueUSD(
                farmAddress,
            );
            await this.setFarmCache(
                farmAddress,
                'lockedValueUSD',
                farmLockedValueUSD,
                oneMinute() * 2,
            );
        }

        for (const token of tokensSupplyConfig) {
            await this.analyticsGetterService.getTotalTokenSupply(token);
        }
        const [totalValueLockedUSD, totalAgregatedRewards] = await Promise.all([
            this.analyticsCompute.computeTotalValueLockedUSD(),
            this.analyticsCompute.computeTotalAgregatedRewards(30),
        ]);
        await Promise.all([
            this.setAnalyticsCache(
                ['totalValueLockedUSD'],
                totalValueLockedUSD,
                oneMinute() * 2,
            ),
            this.setAnalyticsCache(
                [30, 'totalAgregatedRewards'],
                totalAgregatedRewards,
                oneMinute() * 2,
            ),
        ]);

        await this.deleteCacheKeys();
    }

    @Cron(CronExpression.EVERY_30_SECONDS)
    async cacheTokenPriceUSD(): Promise<void> {
        for (const token of cachedTokensPriceConfig) {
            const tokenPriceUSD = await this.analyticsCompute.computeTokenPriceUSD(
                token,
            );
            await this.setAnalyticsCache(
                [token, 'tokenPriceUSD'],
                tokenPriceUSD,
                oneMinute(),
            );
        }
        await this.deleteCacheKeys();
    }

    private async setFarmCache(
        farmAddress: string,
        key: string,
        value: any,
        ttl: number = cacheConfig.default,
    ) {
        const cacheKey = generateCacheKeyFromParams('farm', farmAddress, key);
        await this.cachingService.setCache(cacheKey, value, ttl);
        this.invalidatedKeys.push(cacheKey);
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
