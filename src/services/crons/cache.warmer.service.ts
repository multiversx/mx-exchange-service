import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PriceFeedService } from '../price-feed/price-feed.service';
import { tokensPriceData } from '../../config';
import { CachingService } from '../caching/cache.service';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { oneMinute } from '../../helpers/helpers';

@Injectable()
export class CacheWarmerService {
    constructor(
        private readonly priceFeed: PriceFeedService,
        private readonly cachingService: CachingService,
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
            this.cachingService.setCache(cacheKey, tokenPrice, oneMinute());
        }
    }
}
