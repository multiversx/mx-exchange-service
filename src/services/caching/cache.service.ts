import { Inject, Injectable } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { Cache } from 'cache-manager';
import { cacheConfig } from '../../config';
import { PerformanceProfiler } from '../../utils/performance.profiler';
import { ApiConfigService } from '../../helpers/api.config.service';
import { oneMinute } from 'src/helpers/helpers';
import { MetricsCollector } from 'src/utils/metrics.collector';
import { PendingExecutor } from 'src/utils/pending.executor';
import { setClient } from 'src/utils/redisClient';
import Redis, { RedisOptions } from 'ioredis';
import localCache from '../../utils/local.cache';

@Injectable()
export class CachingService {
    private readonly UNDEFINED_CACHE_VALUE = 'undefined';

    private remoteGetExecutor: PendingExecutor<string, string>;
    private remoteDelExecutor: PendingExecutor<string, number>;
    private localDelExecutor: PendingExecutor<string, void>;

    private static cache: Cache;
    private client: Redis;

    private options: RedisOptions = {
        host: this.configService.getRedisUrl(),
        port: this.configService.getRedisPort(),
        password: this.configService.getRedisPassword(),
        retryStrategy(times: number) {
            const delay = Math.min(times * 50, 5000);
            return delay;
        },
        enableAutoPipelining: true,
    };

    constructor(
        private readonly configService: ApiConfigService,
        @Inject(CACHE_MANAGER) private readonly cache: Cache,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {
        CachingService.cache = this.cache;

        this.client = setClient(this.options);

        this.remoteGetExecutor = new PendingExecutor(
            async (key: string) => await this.client.get(key),
        );

        this.remoteDelExecutor = new PendingExecutor(
            async (key: string) => await this.client.del(key),
        );
        this.localDelExecutor = new PendingExecutor(
            async (key: string) => await CachingService.cache.del(key),
        );
    }

    private async setCacheRemote<T>(
        key: string,
        value: T,
        ttl: number = cacheConfig.default,
    ): Promise<T> {
        if (value === undefined) {
            await this.client.set(
                key,
                this.UNDEFINED_CACHE_VALUE,
                'EX',
                oneMinute() * 2,
            );
            return value;
        }
        await this.client.set(
            key,
            JSON.stringify(value),
            'EX',
            ttl ?? cacheConfig.default,
        );
        return value;
    }

    private async getCacheRemote<T>(key: string): Promise<T | undefined> {
        const profiler = new PerformanceProfiler();

        const response = await this.remoteGetExecutor.execute(key);

        profiler.stop();
        MetricsCollector.setRedisDuration('GET', profiler.duration);

        if (response === undefined || response === this.UNDEFINED_CACHE_VALUE) {
            return undefined;
        }

        return JSON.parse(response);
    }

    async executeRemoteRaw<T>(method, ...args): Promise<T> {
        if (!this.client[method])
            throw new Error(`Redis client method ${method} not defined`);

        return this.client[method](...args);
    }

    async setCacheLocal<T>(
        key: string,
        value: T,
        ttl: number = cacheConfig.default,
    ): Promise<T> {
        if (value === undefined) {
            localCache.set(key, this.UNDEFINED_CACHE_VALUE, {
                ttl: oneMinute() * 1000,
            });
            return value;
        }

        const writeValue =
            typeof value === 'object'
                ? {
                      serialized: true,
                      value: JSON.stringify(value),
                  }
                : {
                      serialized: false,
                      value,
                  };
        localCache.set(key, writeValue, { ttl: ttl * 1000 });
        return value;
    }

    getCacheLocal<T>(key: string): T | undefined {
        const cachedValue: any = localCache.get(key) as T;

        if (!cachedValue) {
            return undefined;
        }

        return cachedValue.serialized === true
            ? JSON.parse(cachedValue.value)
            : cachedValue.value;
    }

    public async getCache<T>(key: string): Promise<T | undefined> {
        const value = this.getCacheLocal<T>(key);
        if (value) {
            return value;
        }

        return await this.getCacheRemote<T>(key);
    }

    public async setCache<T>(
        key: string,
        value: T,
        remoteTtl: number = cacheConfig.default,
        localTtl: number | undefined = undefined,
    ): Promise<T> {
        if (!localTtl) {
            localTtl = remoteTtl / 2;
        }
        await this.setCacheLocal<T>(key, value, localTtl);
        await this.setCacheRemote<T>(key, value, remoteTtl);
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

        let cachedValue = this.getCacheLocal<T>(key);
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

        const value = await promise();

        profiler.stop(`Cache miss for key ${key}`);

        if (localTtl > 0) {
            await this.setCacheLocal<T>(key, value, localTtl);
        }

        if (remoteTtl > 0) {
            await this.setCacheRemote<T>(key, value, remoteTtl);
        }
        return value;
    }

    async deleteInCacheLocal(key: string) {
        localCache.delete(key);
    }

    async deleteInCacheRemote(key: string) {
        await this.remoteDelExecutor.execute(key);
    }

    async deleteInCache(key: string): Promise<string[]> {
        if (key.includes('*')) {
            const allKeys = await this.client.keys(key);
            const promises = [];
            for (const key of allKeys) {
                promises.push(this.deleteInCacheLocal(key));
                promises.push(this.deleteInCacheRemote(key));
            }
            await Promise.all(promises);
            return allKeys;
        } else {
            await Promise.all([localCache.delete(key), this.client.del(key)]);
            return [key];
        }
    }

    async getMultipleFromHash(
        hashKey: string,
        keys: string[],
    ): Promise<(string | null)[]> {
        const profiler = new PerformanceProfiler();

        try {
            const result = await this.client.hmget(hashKey, ...keys);
            return result;
        } catch {
            return keys.map(() => null);
        } finally {
            profiler.stop();
            MetricsCollector.setRedisDuration('HMGET', profiler.duration);
        }
    }

    async setMultipleInHash(
        hashKey: string,
        values: [string, string][],
    ): Promise<void> {
        const profiler = new PerformanceProfiler();

        try {
            await this.client.hset(hashKey, ...values.flat());
        } finally {
            profiler.stop();
            MetricsCollector.setRedisDuration('HMSET', profiler.duration);
        }
    }
}
