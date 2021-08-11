import { Inject, Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { CachingService } from '../caching/cache.service';
import { cacheConfig, farmsConfig } from 'src/config';
import { ClientProxy } from '@nestjs/microservices';
import { AnalyticsService } from 'src/modules/analytics/analytics.service';

@Injectable()
export class AnalyticsCacheWarmerService {
    private invalidatedKeys = [];

    constructor(
        private readonly analyticsService: AnalyticsService,
        private readonly cachingService: CachingService,
        @Inject('PUBSUB_SERVICE') private readonly client: ClientProxy,
    ) {}

    @Cron(CronExpression.EVERY_MINUTE)
    async cacheAnalytics(): Promise<void> {
        for (const farmAddress of farmsConfig) {
            const farmLockedValueUSD = await this.analyticsService.computeFarmLockedValueUSD(
                farmAddress,
            );
            await this.setFarmCache(
                farmAddress,
                'lockedValueUSD',
                farmLockedValueUSD,
            );
        }

        const tokens = ['MEX-b6bb7d', 'LKMEX-7c4256'];
        for (const token of tokens) {
            const totalTokenSupply = await this.analyticsService.computeTotalTokenSupply(
                token,
            );
            await this.setAnalyticsCache(
                [token, 'totalTokenSupply'],
                totalTokenSupply,
            );
        }
        const [totalValueLockedUSD, totalAgregatedRewards] = await Promise.all([
            this.analyticsService.computeTotalValueLockedUSD(),
            this.analyticsService.computeTotalAgregatedRewards(30),
        ]);
        await Promise.all([
            this.setAnalyticsCache(
                ['totalValueLockedUSD'],
                totalValueLockedUSD,
            ),
            this.setAnalyticsCache(
                [30, 'totalAgregatedRewards'],
                totalAgregatedRewards,
            ),
        ]);

        await this.deleteCacheKeys();
    }

    @Cron(CronExpression.EVERY_30_SECONDS)
    async cacheTokenPriceUSD(): Promise<void> {
        const tokens = ['MEX-b6bb7d'];
        for (const token of tokens) {
            const tokenPriceUSD = await this.analyticsService.computeTokenPriceUSD(
                token,
            );
            await this.setAnalyticsCache(
                [token, 'tokenPriceUSD'],
                tokenPriceUSD,
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
        await this.client.emit('deleteCacheKeys', this.invalidatedKeys);
        this.invalidatedKeys = [];
    }
}
