import { Injectable, Inject } from '@nestjs/common';
import { isNil } from '@nestjs/common/utils/shared.utils';
import * as Redis from 'ioredis';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { RedisService } from 'nestjs-redis';
import { generateCacheKey } from '../utils/generate-cache-key';
import { Logger } from 'winston';

@Injectable()
export class RedisCacheService {
    private DEFAULT_TTL = 300;
    constructor(
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
        private readonly redisService: RedisService,
    ) {}

    getClient(clientName?: string): Redis.Redis {
        return this.redisService.getClient(clientName);
    }
    async get(
        client: Redis.Redis,
        key: string,
        region: string = null,
    ): Promise<any> {
        const cacheKey = generateCacheKey(key, region);
        try {
            return JSON.parse(await client.get(cacheKey));
        } catch (err) {
            this.logger.error(
                'An error occurred while trying to get from redis cache.',
                {
                    path: 'redis-cache.service.get',
                    exception: err.toString(),
                    cacheKey: cacheKey,
                },
            );
            return null;
        }
    }
    async set(
        client: Redis.Redis,
        key: string,
        value: any,
        ttl: number = this.DEFAULT_TTL,
        region: string = null,
    ): Promise<void> {
        if (isNil(value)) {
            return;
        }
        const cacheKey = generateCacheKey(key, region);
        try {
            await client.set(cacheKey, JSON.stringify(value), 'EX', ttl);
        } catch (err) {
            this.logger.error(
                'An error occurred while trying to set in redis cache.',
                {
                    path: 'redis-cache.service.set',
                    exception: err.toString(),
                    cacheKey: cacheKey,
                },
            );
            return;
        }
    }

    async del(
        client: Redis.Redis,
        key: string,
        region: string = null,
    ): Promise<void> {
        const cacheKey = generateCacheKey(key, region);
        try {
            await client.del(cacheKey);
        } catch (err) {
            this.logger.error(
                'An error occurred while trying to delete from redis cache.',
                {
                    path: 'redis-cache.service.del',
                    exception: err.toString(),
                    cacheKey: cacheKey,
                },
            );
        }
    }

    async flushDb(client: Redis.Redis): Promise<void> {
        try {
            await client.flushdb();
        } catch (err) {
            this.logger.error(
                'An error occurred while trying to flush the db',
                {
                    path: 'redis-cache.service.flushDb',
                    exception: err.toString(),
                },
            );
        }
    }

    async getOrSet(
        client: Redis.Redis,
        key: string,
        createValueFunc: () => any,
        ttl: number = this.DEFAULT_TTL,
        region: string = null,
    ): Promise<any> {
        const cachedData = await this.get(client, key, region);
        if (!isNil(cachedData)) {
            return cachedData;
        }
        const internalCreateValueFunc = this.buildInternalCreateValueFunc(
            key,
            region,
            createValueFunc,
        );
        const value = await internalCreateValueFunc();
        await this.set(client, key, value, ttl, region);
        return value;
    }

    async setOrUpdate(
        client: Redis.Redis,
        key: string,
        createValueFunc: () => any,
        ttl: number = this.DEFAULT_TTL,
        region: string = null,
    ): Promise<any> {
        const internalCreateValueFunc = this.buildInternalCreateValueFunc(
            key,
            region,
            createValueFunc,
        );
        const value = await internalCreateValueFunc();
        await this.set(client, key, value, ttl, region);
        return value;
    }

    private buildInternalCreateValueFunc(
        key: string,
        region: string,
        createValueFunc: () => any,
    ): () => Promise<any> {
        return async () => {
            try {
                let data = createValueFunc();
                if (data instanceof Promise) {
                    data = await data;
                }
                return data;
            } catch (err) {
                this.logger.error(
                    `An error occurred while trying to load value.`,
                    {
                        path: 'redis-cache.service.createValueFunc',
                        exception: err.toString(),
                        key,
                        region,
                    },
                );
                return null;
            }
        };
    }
}
