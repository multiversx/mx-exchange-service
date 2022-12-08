import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { CachingService } from '../caching/cache.service';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { ElrondApiService } from '../elrond-communication/elrond-api.service';
import { PUB_SUB } from '../redis.pubSub.module';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { oneMinute, oneSecond } from 'src/helpers/helpers';
import axios from 'axios';
import moment from 'moment';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { RouterService } from 'src/modules/router/services/router.service';

@Injectable()
export class CacheWarmerService {
    constructor(
        private readonly apiService: ElrondApiService,
        private readonly cachingService: CachingService,
        private readonly routerService: RouterService,
        @Inject(PUB_SUB) private pubSub: RedisPubSub,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) { }

    @Cron('*/6 * * * * *')
    async cacheCurrentEpoch(): Promise<void> {
        const stats = await this.apiService.getStats();
        const ttl = (stats.roundsPerEpoch - stats.roundsPassed) * 6;
        const cacheKey = generateCacheKeyFromParams('context', 'currentEpoch');
        await this.cachingService.setCache(cacheKey, stats.epoch, ttl);
        await this.deleteCacheKeys([cacheKey]);
    }

    @Cron('*/6 * * * * *')
    async cachePairs(): Promise<void> {
        const keysToProcess: string[] = await this.cachingService.executeRemoteRaw('keys', 'allPairs.*.body');
        await Promise.allSettled(keysToProcess.map(async key => {
            // get value of key 

            const paramsRaw: any = await this.cachingService.getCache(key);
            if (!paramsRaw) return null;

            const { offset, limit, pairFilter } = paramsRaw;

            const md5 = key.split('.')[1];
            const updateCache = await this.routerService.getAllPairs(
                offset,
                limit,
                pairFilter,
                true
            );

            return await this.cachingService.setCache(`allPairs.${md5}.response`, updateCache, 12 * oneSecond());
        }));
    }

    @Cron('*/6 * * * * *')
    async cacheGuest(): Promise<void> {
        // recompute cache
        const currentDate = moment().format('YYYY-MM-DD_HH:mm');
        const prefix = 'guestCache';
        const threshold = Number(process.env.ENABLE_CACHE_GUEST_RATE_THRESHOLD || 100);
        const keysToCompute: string[] = await this.cachingService.executeRemoteRaw('zrange', `${prefix}.${currentDate}`, threshold, '+inf', 'BYSCORE');

        await Promise.allSettled(keysToCompute.map(async key => {
            const parsedKey = `${prefix}.${key}.body`;
            const keyValue: object = await this.cachingService.getCache(parsedKey);
            if (!keyValue) {
                return Promise.resolve();
            }

            this.logger.log(`Using guestCache to warm up query '${JSON.stringify(keyValue)}'`);

            // Get new data without cache and update it
            const { data } = await axios.post(`${process.env.ELRONDDEX_URL}/graphql`, keyValue, {
                headers: {
                    'no-cache': true
                }
            });

            return this.cachingService.setCache(`${prefix}.${key}.response`, data, 12 * oneSecond());
        }));
    }

    @Cron('*/6 * * * * *')
    async cacheShardCurrentBlockNonce(): Promise<void> {
        const stats = await this.apiService.getStats();
        const promises: Promise<number>[] = [];
        for (let index = 0; index < stats.shards; index++) {
            promises.push(this.apiService.getCurrentBlockNonce(index));
        }
        const shardsNonces = await Promise.all(promises);
        const invalidatedKeys: string[] = [];
        for (let index = 0; index < stats.shards; index++) {
            const cacheKey = generateCacheKeyFromParams(
                'context',
                'shardBlockNonce',
                index,
            );
            await this.cachingService.setCache(
                cacheKey,
                shardsNonces[index],
                oneMinute(),
            );
        }

        await this.deleteCacheKeys(invalidatedKeys);
    }

    private async deleteCacheKeys(invalidatedKeys: string[]) {
        await this.pubSub.publish('deleteCacheKeys', invalidatedKeys);
    }
};
