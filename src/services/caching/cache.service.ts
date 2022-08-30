import { Injectable, Inject, CACHE_MANAGER } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { generateSetLogMessage } from '../../utils/generate-log-message';
import { Cache } from 'cache-manager';
import { promisify } from 'util';
import { cacheConfig } from '../../config';
import { PerformanceProfiler } from '../../utils/performance.profiler';
import { ApiConfigService } from '../../helpers/api.config.service';
import * as Redis from 'ioredis';
import { oneMinute } from 'src/helpers/helpers';
import { MetricsCollector } from 'src/utils/metrics.collector';

@Injectable()
export class CachingService {
    private readonly UNDEFINED_CACHE_VALUE = 'undefined';

    private options: Redis.RedisOptions = {
        host: this.configService.getRedisUrl(),
        port: this.configService.getRedisPort(),
        password: this.configService.getRedisPassword(),
        retryStrategy(times: number) {
            const delay = Math.min(times * 50, 5000);
            return delay;
        },
        enableAutoPipelining: true,
    };
    private client = new Redis.default(this.options);
    private static cache: Cache;
    private asyncSet = promisify(this.getClient().set).bind(this.getClient());
    private asyncGet = promisify(this.getClient().get).bind(this.getClient());
    private asyncMGet = promisify(this.getClient().mget).bind(this.getClient());
    private asyncMulti = promisify(this.getClient().multi).bind(
        this.getClient(),
    );
    private asyncDel = promisify(this.getClient().del).bind(this.getClient());
    private asyncKeys = promisify(this.getClient().keys).bind(this.getClient());

    constructor(
        private readonly configService: ApiConfigService,
        @Inject(CACHE_MANAGER) private readonly cache: Cache,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {
        CachingService.cache = this.cache;
    }

    getClient(): Redis.Redis {
        return this.client;
    }

    private async setCacheRemote<T>(
        key: string,
        value: T,
        ttl: number = cacheConfig.default,
    ): Promise<T> {
        if (value === undefined) {
            await this.asyncSet(
                key,
                this.UNDEFINED_CACHE_VALUE,
                'EX',
                oneMinute() * 2,
            );
            return value;
        }
        await this.asyncSet(
            key,
            JSON.stringify(value),
            'EX',
            ttl ?? cacheConfig.default,
        );
        return value;
    }

    pendingGetRemotes: { [key: string]: Promise<any> } = {};

    private async getCacheRemote<T>(key: string): Promise<T | undefined> {
        let response: any;
        const profiler = new PerformanceProfiler();
        let pendingGetRemote = this.pendingGetRemotes[key];
        if (pendingGetRemote) {
            response = await pendingGetRemote;
        } else {
            pendingGetRemote = this.asyncGet(key);

            this.pendingGetRemotes[key] = pendingGetRemote;

            response = await pendingGetRemote;

            delete this.pendingGetRemotes[key];
        }

        profiler.stop();
        MetricsCollector.setRedisDuration('GET', profiler.duration);

        if (response === undefined || response === this.UNDEFINED_CACHE_VALUE) {
            return undefined;
        }

        return JSON.parse(response);
    }

    async setCacheLocal<T>(
        key: string,
        value: T,
        ttl: number = cacheConfig.default,
    ): Promise<T> {
        if (value === undefined) {
            await CachingService.cache.set<string>(
                key,
                this.UNDEFINED_CACHE_VALUE,
                oneMinute(),
            );
            return value;
        }
        await CachingService.cache.set<T>(key, value, { ttl });
        return value;
    }

    async getCacheLocal<T>(key: string): Promise<T | undefined> {
        return await CachingService.cache.get<T>(key);
    }

    public async getCache<T>(key: string): Promise<T | undefined> {
        const value = await this.getCacheLocal<T>(key);
        if (value) {
            return value;
        }

        return await this.getCacheRemote<T>(key);
    }

    public async setCache<T>(
        key: string,
        value: T,
        ttl: number = cacheConfig.default,
    ): Promise<T> {
        await this.setCacheLocal<T>(key, value, ttl);
        await this.setCacheRemote<T>(key, value, ttl);
        return value;
    }

    async getOrSet<T>(
        key: string,
        promise: () => Promise<T>,
        remoteTtl: number = cacheConfig.default,
        localTtl: number | undefined = undefined,
    ): Promise<any> {
        if (!localTtl) {
            localTtl = remoteTtl / 2;
        }

        const profiler = new PerformanceProfiler(`vmQuery:${key}`);

        let cachedValue = await this.getCacheLocal<T>(key);
        if (cachedValue !== undefined) {
            profiler.stop(`Local Cache hit for key ${key}`);
            return cachedValue === this.UNDEFINED_CACHE_VALUE
                ? undefined
                : cachedValue;
        }

        cachedValue = await this.getCacheRemote<T>(key);
        if (cachedValue !== null) {
            profiler.stop(`Remote Cache hit for key ${key}`);

            // we only set ttl to half because we don't know what the real ttl of the item is and we want it to work good in most scenarios
            await this.setCacheLocal<T>(key, cachedValue, localTtl);
            return cachedValue;
        }

        try {
            const value = await promise();

            profiler.stop(`Cache miss for key ${key}`);

            if (localTtl > 0) {
                await this.setCacheLocal<T>(key, value, localTtl);
            }

            if (remoteTtl > 0) {
                await this.setCacheRemote<T>(key, value, remoteTtl);
            }
            return value;
        } catch (error) {
            const logMessage = generateSetLogMessage(
                CachingService.name,
                this.getOrSet.name,
                key,
                error.message,
            );
            this.logger.error(logMessage);
            throw error;
        }
    }

    async deleteInCacheLocal(key: string) {
        await CachingService.cache.del(key);
    }

    async deleteInCache(key: string): Promise<string[]> {
        const invalidatedKeys = [];

        if (key.includes('*')) {
            const allKeys = await this.asyncKeys(key);
            for (const key of allKeys) {
                // this.logger.log(`Invalidating key ${key}`);
                await CachingService.cache.del(key);
                await this.asyncDel(key);
                invalidatedKeys.push(key);
            }
        } else {
            // this.logger.log(`Invalidating key ${key}`);
            await CachingService.cache.del(key);
            await this.asyncDel(key);
            invalidatedKeys.push(key);
        }

        return invalidatedKeys;
    }
}
