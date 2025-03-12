import { Injectable } from '@nestjs/common';
import { OriginLogger, PendingExecuter } from '@multiversx/sdk-nestjs-common';
import '@multiversx/sdk-nestjs-common/lib/utils/extensions/array.extensions';
import { RedisCacheService } from '@multiversx/sdk-nestjs-cache';
import { InMemoryCacheService } from './in.memory.cache.service';
import { parseCachedNullOrUndefined } from 'src/utils/cache.utils';

@Injectable()
export class CacheService {
    private readonly pendingExecuter: PendingExecuter;
    private readonly logger = new OriginLogger(CacheService.name);

    constructor(
        private readonly inMemoryCacheService: InMemoryCacheService,
        private readonly redisCacheService: RedisCacheService,
    ) {
        this.pendingExecuter = new PendingExecuter();
    }

    getLocal<T>(key: string): T | undefined {
        return this.inMemoryCacheService.get<T>(key);
    }

    getManyLocal<T>(keys: string[]): (T | undefined)[] {
        return this.inMemoryCacheService.getMany<T>(keys);
    }

    setLocal<T>(
        key: string,
        value: T,
        ttl: number,
        cacheNullable = true,
    ): void {
        return this.inMemoryCacheService.set<T>(key, value, ttl, cacheNullable);
    }

    setManyLocal<T>(
        keys: string[],
        values: T[],
        ttl: number,
        cacheNullable = true,
    ): void {
        return this.inMemoryCacheService.setMany(
            keys,
            values,
            ttl,
            cacheNullable,
        );
    }

    deleteLocal(key: string): void {
        return this.inMemoryCacheService.delete(key);
    }

    deleteManyLocal(keys: string[]): void {
        for (const key of keys) {
            this.inMemoryCacheService.delete(key);
        }
    }

    getRemote<T>(key: string): Promise<T | undefined> {
        return this.buildInternalCreateValueFunc<T>(`getRemote.${key}`, () =>
            this.redisCacheService.get<T>(key),
        )();
    }

    getManyRemote<T>(keys: string[]): Promise<(T | undefined | null)[]> {
        return this.redisCacheService.getMany(keys);
    }

    setRemote<T>(
        key: string,
        value: T,
        ttl: number | null = null,
        cacheNullable = true,
    ): Promise<void> {
        return this.redisCacheService.set<T>(key, value, ttl, cacheNullable);
    }

    async setManyRemote<T>(
        keys: string[],
        values: T[],
        ttl: number,
        cacheNullable = true,
    ): Promise<void> {
        await this.redisCacheService.setMany(keys, values, ttl, cacheNullable);
    }

    setTtlRemote(key: string, ttl: number): Promise<void> {
        return this.redisCacheService.expire(key, ttl);
    }

    deleteRemote(key: string): Promise<void> {
        return this.redisCacheService.delete(key);
    }

    deleteManyRemote(keys: string[]): Promise<void> {
        return this.redisCacheService.deleteMany(keys);
    }

    getKeys(key: string): Promise<string[]> {
        return this.redisCacheService.keys(key);
    }

    getOrSetRemote<T>(
        key: string,
        createValueFunc: () => Promise<T>,
        ttl: number,
        cacheNullable = true,
    ): Promise<T> {
        return this.redisCacheService.getOrSet<T>(
            key,
            () => {
                return this.executeWithPendingPromise(key, createValueFunc);
            },
            ttl,
            cacheNullable,
        );
    }

    incrementRemote(key: string, ttl: number | null = null): Promise<number> {
        return this.redisCacheService.increment(key, ttl);
    }

    zIncrementRemote(
        key: string,
        increment: number,
        member: string,
    ): Promise<string> {
        return this.redisCacheService.zincrby(key, member, increment);
    }

    zRangeByScoreRemote(
        key: string,
        from: number,
        to: number,
    ): Promise<string[]> {
        return this.redisCacheService.zrangebyscore(key, from, to, {
            withScores: true,
        });
    }

    async get<T>(key: string): Promise<T | undefined> {
        const inMemoryCacheValue = this.inMemoryCacheService.get<T>(key);
        if (inMemoryCacheValue) {
            return inMemoryCacheValue;
        }
        return this.redisCacheService.get<T>(key);
    }

    async getMany<T>(
        keys: string[],
        localTtl: number,
    ): Promise<(T | undefined)[]> {
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

        if (missingKeys.length === 0) {
            return values.map((value) => parseCachedNullOrUndefined(value));
        }

        const remoteValues = await this.getManyRemote<T>(missingKeys);

        if (localTtl > 0) {
            this.setManyLocal<T>(
                missingKeys,
                remoteValues.map((value) =>
                    value ? parseCachedNullOrUndefined(value) : undefined,
                ),
                localTtl,
            );
        }

        for (const [index, missingIndex] of missingIndexes.entries()) {
            const remoteValue = remoteValues[index];
            values[missingIndex] = remoteValue ? remoteValue : undefined;
        }

        return values;
    }

    async set<T>(
        key: string,
        value: T,
        ttl: number,
        inMemoryTtl: number = ttl,
        cacheNullable = true,
    ): Promise<void> {
        this.inMemoryCacheService.set<T>(
            key,
            value,
            inMemoryTtl,
            cacheNullable,
        );
        await this.redisCacheService.set<T>(key, value, ttl, cacheNullable);
    }

    async setMany<T>(
        keys: string[],
        values: T[],
        ttl: number,
        cacheNullable = true,
    ): Promise<void> {
        this.setManyLocal(keys, values, ttl, cacheNullable);
        await this.setManyRemote(keys, values, ttl, cacheNullable);
    }

    async delete(key: string): Promise<void> {
        this.inMemoryCacheService.delete(key);
        await this.redisCacheService.delete(key);
    }

    async deleteMany(keys: string[]): Promise<void> {
        this.deleteManyLocal(keys);
        await this.deleteManyRemote(keys);
    }

    async getOrSet<T>(
        key: string,
        createValueFunc: () => Promise<T>,
        ttl: number,
        inMemoryTtl: number = ttl,
        cacheNullable = true,
    ): Promise<T> {
        const internalCreateValueFunc = this.buildInternalCreateValueFunc<T>(
            key,
            createValueFunc,
        );
        const getOrAddFromRedisFunc = async (): Promise<T> => {
            return await this.redisCacheService.getOrSet<T>(
                key,
                internalCreateValueFunc,
                ttl,
                cacheNullable,
            );
        };

        return this.inMemoryCacheService.getOrSet<T>(
            key,
            getOrAddFromRedisFunc,
            inMemoryTtl,
            cacheNullable,
        );
    }

    private executeWithPendingPromise<T>(
        key: string,
        promise: () => Promise<T>,
    ): Promise<T> {
        return this.pendingExecuter.execute(key, promise);
    }

    private buildInternalCreateValueFunc<T>(
        key: string,
        createValueFunc: () => Promise<T>,
    ): () => Promise<T> {
        return async () => {
            try {
                const data = await this.executeWithPendingPromise(
                    key,
                    createValueFunc,
                );
                return data;
            } catch (error) {
                if (error instanceof Error) {
                    this.logger.error(
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
            for (const key of allKeys) {
                this.deleteLocal(key);
                await this.redisCacheService.delete(key);

                invalidatedKeys.push(key);
            }
        } else {
            this.deleteLocal(key);
            await this.redisCacheService.delete(key);
            invalidatedKeys.push(key);
        }

        return invalidatedKeys;
    }
}
