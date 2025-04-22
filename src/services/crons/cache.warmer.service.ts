import { Inject, Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CacheService } from 'src/services/caching/cache.service';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { MXApiService } from '../multiversx-communication/mx.api.service';
import { PUB_SUB } from '../redis.pubSub.module';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { Constants } from '@multiversx/sdk-nestjs-common';
import axios from 'axios';
import moment from 'moment';
import { MetricsCollector } from 'src/utils/metrics.collector';
import { PerformanceProfiler } from 'src/utils/performance.profiler';
import { MXDataApiService } from '../multiversx-communication/mx.data.api.service';
import { Locker } from '@multiversx/sdk-nestjs-common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

@Injectable()
export class CacheWarmerService {
    constructor(
        private readonly apiService: MXApiService,
        private readonly cachingService: CacheService,
        private readonly dataApi: MXDataApiService,
        @Inject(PUB_SUB) private pubSub: RedisPubSub,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    @Cron(CronExpression.EVERY_5_MINUTES)
    async cacheUSDCPrice(): Promise<void> {
        const usdcPrice = await this.dataApi.getTokenPriceRaw('USDC');
        const key = await this.dataApi.setTokenPrice('USDC', usdcPrice);
        await this.deleteCacheKeys([key]);
    }

    @Cron('*/6 * * * * *')
    async cacheCurrentEpoch(): Promise<void> {
        const stats = await this.apiService.getStats();
        const ttl = (stats.roundsPerEpoch - stats.roundsPassed) * 6;
        const cacheKey = generateCacheKeyFromParams('context', 'currentEpoch');
        await this.cachingService.set(cacheKey, stats.epoch, ttl);
        await this.deleteCacheKeys([cacheKey]);
    }

    @Cron('*/6 * * * * *')
    async cacheGuest(): Promise<void> {
        // recompute cache
        const dateFormat = 'YYYY-MM-DD_HH:mm';
        const currentDate = moment().format(dateFormat);
        const previousMinute = moment()
            .subtract(1, 'minute')
            .format(dateFormat);

        const prefix = 'guestCache';
        const threshold = Number(
            process.env.ENABLE_CACHE_GUEST_RATE_THRESHOLD || 100,
        );
        const keysToComputeCurrentMinute: string[] =
            await this.cachingService.zRangeByScoreRemote(
                `${prefix}.${currentDate}`,
                threshold,
                Number.POSITIVE_INFINITY,
            );
        const keysToComputePreviousMinute: string[] =
            await this.cachingService.zRangeByScoreRemote(
                `${prefix}.${previousMinute}`,
                threshold,
                Number.POSITIVE_INFINITY,
            );

        const keysToCompute = [
            ...new Set([
                ...keysToComputeCurrentMinute,
                ...keysToComputePreviousMinute,
            ]),
        ];

        await Promise.allSettled(
            keysToCompute.map(async (key) => {
                await Locker.lock(key, async () => {
                    const parsedKey = `${prefix}.${key}.body`;
                    const keyValue: object = await this.cachingService.get(
                        parsedKey,
                    );

                    if (!keyValue) {
                        return Promise.resolve();
                    }

                    this.logger.info(
                        `Started warming up query '${JSON.stringify(
                            keyValue,
                        )}' for url '${process.env.MX_DEX_URL}'`,
                        { context: 'GuestCache' },
                    );
                    const profiler = new PerformanceProfiler();

                    try {
                        // Get new data without cache and update it
                        const response = await axios.post(
                            `${process.env.MX_DEX_URL}/graphql`,
                            keyValue,
                            {
                                headers: {
                                    'Content-Type': 'application/json',
                                    'no-cache': true,
                                },
                            },
                        );

                        profiler.stop();
                        const data = response.data;

                        this.logger.info(
                            `Finished warming up query '${JSON.stringify(
                                keyValue,
                            )}' for url '${
                                process.env.MX_DEX_URL
                            }'. Response size: ${
                                JSON.stringify(data).length
                            }. Duration: ${profiler.duration}`,
                            { context: 'GuestCache' },
                        );

                        await this.cachingService.set(
                            `${prefix}.${key}.response`,
                            data,
                            Constants.oneSecond() * 30,
                        );
                        return data;
                    } catch (error) {
                        this.logger.error(
                            `An error occurred while warming up query '${JSON.stringify(
                                keyValue,
                            )}' for url '${process.env.MX_DEX_URL}'`,
                            { context: 'GuestCache', trace: error.stack },
                        );
                    } finally {
                        profiler.stop();
                    }
                });
            }),
        );

        MetricsCollector.setGuestHitQueries(keysToCompute.length);
    }

    @Cron('*/6 * * * * *')
    async cacheShardCurrentBlockNonce(): Promise<void> {
        const stats = await this.apiService.getStats();
        let promises: Promise<number>[] = [];
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
            await this.cachingService.set(
                cacheKey,
                shardsNonces[index],
                Constants.oneMinute(),
            );
            invalidatedKeys.push(cacheKey);
        }

        promises = [];
        for (let index = 0; index < stats.shards; index++) {
            promises.push(
                this.apiService.getShardBlockCountInEpoch(stats.epoch, index),
            );
        }
        const shardsBlockCount = await Promise.all(promises);
        for (let index = 0; index < stats.shards; index++) {
            const cacheKey = generateCacheKeyFromParams(
                'context',
                'blocksCountInEpoch',
                index,
                stats.epoch,
            );
            await this.cachingService.set(
                cacheKey,
                shardsBlockCount[index],
                Constants.oneMinute(),
            );
            invalidatedKeys.push(cacheKey);
        }

        await this.deleteCacheKeys(invalidatedKeys);
    }

    private async deleteCacheKeys(invalidatedKeys: string[]) {
        await this.pubSub.publish('deleteCacheKeys', invalidatedKeys);
    }
}
