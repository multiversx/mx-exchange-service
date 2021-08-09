import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PriceFeedService } from '../price-feed/price-feed.service';
import { cacheConfig, tokensPriceData } from '../../config';
import { RedisCacheService } from '../redis-cache.service';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';

@Injectable()
export class CacheWarmerService {
    constructor(
        private readonly priceFeed: PriceFeedService,
        private readonly redisCacheService: RedisCacheService,
    ) {}

    @Cron(CronExpression.EVERY_30_SECONDS)
    async cachePriceFeeds(): Promise<void> {
        for (const priceFeed in tokensPriceData) {
            const tokenPrice = await this.priceFeed.getTokenPriceRaw(
                tokensPriceData.get(priceFeed),
            );
            const cacheKey = generateCacheKeyFromParams(
                'priceFeed',
                tokensPriceData.get(priceFeed),
            );
            this.redisCacheService.set(
                this.redisCacheService.getClient(),
                cacheKey,
                tokenPrice,
                cacheConfig.reserves,
            );
        }
    }
}
