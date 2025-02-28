import { Inject, Injectable, Optional } from '@nestjs/common';
import '@multiversx/sdk-nestjs-common/lib/utils/extensions/array.extensions';
import {
    RedisCacheService,
    CacheService as SdkCacheService,
    InMemoryCacheService as InMemoryLruCacheService,
} from '@multiversx/sdk-nestjs-cache';
import { InMemoryCacheService } from './in.memory.cache.service';
import { CachingModuleOptions } from '@multiversx/sdk-nestjs-cache/lib/entities/caching.module.options';
import { OriginLogger, PendingExecuter } from '@multiversx/sdk-nestjs-common';
import { ADDITIONAL_CACHING_OPTIONS } from './cache.module';

@Injectable()
export class CacheService extends SdkCacheService {
    private readonly customPendingExecuter: PendingExecuter;
    private readonly originLogger = new OriginLogger(CacheService.name);

    constructor(
        @Optional()
        @Inject(ADDITIONAL_CACHING_OPTIONS)
        private readonly remoteCacheOptions: CachingModuleOptions,
        private readonly inMemoryLruCacheService: InMemoryLruCacheService,
        private readonly remoteCacheService: RedisCacheService,
        private readonly inMemoryTtlCacheService: InMemoryCacheService,
    ) {
        super(remoteCacheOptions, inMemoryLruCacheService, remoteCacheService);
        this.customPendingExecuter = new PendingExecuter();
    }

    getLocal<T>(key: string): T | undefined;
    getLocal<T>(key: string): Promise<T | undefined>;
    getLocal<T>(key: string): T | undefined | Promise<T | undefined> {
        return this.inMemoryTtlCacheService.get<T>(key);
    }

    getManyLocal<T>(keys: string[]): (T | undefined)[];
    getManyLocal<T>(keys: string[]): Promise<(T | undefined)[]>;
    getManyLocal<T>(
        keys: string[],
    ): (T | undefined)[] | Promise<(T | undefined)[]> {
        return this.inMemoryTtlCacheService.getMany<T>(keys);
    }

    setLocal<T>(
        key: string,
        value: T,
        ttl: number,
        cacheNullable = true,
    ): void {
        return this.inMemoryTtlCacheService.set<T>(
            key,
            value,
            ttl,
            cacheNullable,
        );
    }

    setManyLocal<T>(
        keys: string[],
        values: T[],
        ttl: number,
        cacheNullable?: boolean,
    ): void;
    setManyLocal<T>(
        keys: string[],
        values: T[],
        ttl: number,
        cacheNullable?: boolean,
    ): Promise<void>;
    setManyLocal<T>(
        keys: string[],
        values: T[],
        ttl: number,
        cacheNullable = true,
    ): void | Promise<void> {
        return this.inMemoryTtlCacheService.setMany(
            keys,
            values,
            ttl,
            cacheNullable,
        );
    }

    deleteLocal(key: string): void;
    deleteLocal(key: string): Promise<void>;
    deleteLocal(key: string): void | Promise<void> {
        return this.inMemoryTtlCacheService.delete(key);
    }

    deleteManyLocal(keys: string[]): void;
    deleteManyLocal(keys: string[]): Promise<void>;
    deleteManyLocal(keys: string[]): void | Promise<void> {
        return this.inMemoryTtlCacheService.deleteMany(keys);
    }

    getOrSetLocal<T>(
        key: string,
        createValueFunc: () => Promise<T>,
        ttl: number,
        cacheNullable = true,
    ): Promise<T> {
        return this.inMemoryTtlCacheService.getOrSet<T>(
            key,
            () => {
                return this.executeWithPromise(key, createValueFunc);
            },
            ttl,
            cacheNullable,
        );
    }

    setOrUpdateLocal<T>(
        key: string,
        createValueFunc: () => Promise<T>,
        ttl: number,
        cacheNullable = true,
    ): Promise<T> {
        return this.inMemoryTtlCacheService.setOrUpdate<T>(
            key,
            createValueFunc,
            ttl,
            cacheNullable,
        );
    }

    async get<T>(key: string): Promise<T | undefined> {
        const inMemoryCacheValue = this.getLocal<T>(key);
        if (inMemoryCacheValue) {
            return inMemoryCacheValue;
        }
        return this.getRemote<T>(key);
    }

    async getMany<T>(keys: string[]): Promise<(T | undefined)[]> {
        const values = this.getManyLocal<T>(keys);

        const missingIndexes: number[] = [];
        values.forEach((value, index) => {
            if (!value) {
                missingIndexes.push(index);
            }
        });

        const missingKeys: string[] = [];
        for (const missingIndex of missingIndexes) {
            missingKeys.push(keys[missingIndex]);
        }

        const remoteValues = await this.getManyRemote<T>(missingKeys);

        for (const [index, missingIndex] of missingIndexes.entries()) {
            const remoteValue = remoteValues[index];
            values[missingIndex] = remoteValue ? remoteValue : undefined;
        }

        return values;
    }

    set<T>(
        key: string,
        value: T,
        ttl: number,
        inMemoryTtl: number = ttl,
        cacheNullable = true,
    ): Promise<void> {
        this.setLocal<T>(key, value, inMemoryTtl, cacheNullable);
        return this.setRemote<T>(key, value, ttl, cacheNullable);
    }

    setMany<T>(
        keys: string[],
        values: T[],
        ttl: number,
        cacheNullable = true,
    ): Promise<void> {
        this.setManyLocal(keys, values, ttl, cacheNullable);
        return this.setManyRemote(keys, values, ttl, cacheNullable);
    }

    delete(key: string): Promise<void> {
        this.deleteLocal(key);
        return this.deleteRemote(key);
    }

    deleteMany(keys: string[]): Promise<void> {
        this.deleteManyLocal(keys);
        return this.deleteManyRemote(keys);
    }

    async getOrSet<T>(
        key: string,
        createValueFunc: () => Promise<T>,
        ttl: number,
        inMemoryTtl: number = ttl,
        cacheNullable = true,
    ): Promise<T> {
        const internalCreateValueFunc =
            this.buildInternalCreateValueFunction<T>(key, createValueFunc);
        const getOrAddFromRedisFunc = async (): Promise<T> => {
            return await this.getOrSetRemote<T>(
                key,
                internalCreateValueFunc,
                ttl,
                cacheNullable,
            );
        };

        return this.getOrSetLocal<T>(
            key,
            getOrAddFromRedisFunc,
            inMemoryTtl,
            cacheNullable,
        );
    }

    private executeWithPromise<T>(
        key: string,
        promise: () => Promise<T>,
    ): Promise<T> {
        return this.customPendingExecuter.execute(key, promise);
    }

    private buildInternalCreateValueFunction<T>(
        key: string,
        createValueFunc: () => Promise<T>,
    ): () => Promise<T> {
        return async () => {
            try {
                const data = await this.executeWithPromise(
                    key,
                    createValueFunc,
                );
                return data;
            } catch (error) {
                if (error instanceof Error) {
                    this.originLogger.error(
                        'Caching - An error occurred while trying to load value.',
                        {
                            error: error?.toString(),
                            key,
                        },
                    );
                }
                throw error;
            }
        };
    }

    async deleteInCache(key: string): Promise<string[]> {
        const invalidatedKeys = [];

        if (key.includes('*')) {
            const allKeys = await this.getKeys(key);

            this.deleteManyLocal(allKeys);
            await this.deleteManyRemote(allKeys);
            invalidatedKeys.push(allKeys);
        } else {
            this.deleteLocal(key);
            await this.deleteRemote(key);
            invalidatedKeys.push(key);
        }

        return invalidatedKeys;
    }
}
