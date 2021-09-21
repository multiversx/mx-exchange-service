import { Inject, Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PriceFeedService } from '../price-feed/price-feed.service';
import { tokensPriceData } from '../../config';
import { CachingService } from '../caching/cache.service';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { oneMinute } from '../../helpers/helpers';
import { ElrondApiService } from '../elrond-communication/elrond-api.service';
import { PUB_SUB } from '../redis.pubSub.module';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { BattleOfYieldsService } from 'src/modules/battle-of-yields/battle.of.yields.service';
import { Locker } from 'src/utils/locker';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

@Injectable()
export class CacheWarmerService {
    private invalidatedKeys = [];

    constructor(
        private readonly apiService: ElrondApiService,
        private readonly priceFeed: PriceFeedService,
        private readonly boyService: BattleOfYieldsService,
        private readonly cachingService: CachingService,
        @Inject(PUB_SUB) private pubSub: RedisPubSub,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
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

            this.invalidatedKeys.push(cacheKey);
            await this.deleteCacheKeys();
        }
    }

    @Cron(CronExpression.EVERY_MINUTE)
    async cacheCurrentEpoch(): Promise<void> {
        const stats = await this.apiService.getStats();
        const ttl = (stats.roundsPerEpoch - stats.roundsPassed) * 6;
        const cacheKey = generateCacheKeyFromParams('context', 'currentEpoch');
        this.cachingService.setCache(cacheKey, stats.epoch, ttl);

        this.invalidatedKeys.push(cacheKey);
        await this.deleteCacheKeys();
    }

    @Cron(CronExpression.EVERY_HOUR)
    async cacheLeaderBoard(): Promise<void> {
        await Locker.lock('Leaderboard', async () => {
            try {
                const leaderBoard = await this.boyService.computeLeaderBoard();
                const cacheKey = generateCacheKeyFromParams(
                    'battleOfYields',
                    'leaderBoard',
                );
                console.log('Cached leaderboard');
                this.cachingService.setCache(
                    cacheKey,
                    leaderBoard,
                    oneMinute() * 90,
                );
                this.invalidatedKeys.push(cacheKey);
                await this.deleteCacheKeys();
            } catch (error) {
                this.logger.error(
                    'an error occured while computing leaderboard',
                    {
                        path: `${CacheWarmerService.name}.${this.cacheLeaderBoard.name}`,
                        error,
                    },
                );
                const cacheKey = generateCacheKeyFromParams(
                    'battleOfYields',
                    'leaderBoard',
                );
                const leaderBoard = this.cachingService.getCache(cacheKey);
                this.cachingService.setCache(
                    cacheKey,
                    leaderBoard,
                    oneMinute() * 90,
                );
                this.invalidatedKeys.push(cacheKey);
                await this.deleteCacheKeys();
            }
        });
    }

    private async deleteCacheKeys() {
        await this.pubSub.publish('deleteCacheKeys', this.invalidatedKeys);
        this.invalidatedKeys = [];
    }
}
