import { Injectable } from '@nestjs/common';
import {
    OriginLogger,
    BatchUtils,
    PendingExecuter,
} from '@multiversx/sdk-nestjs-common';
import '@multiversx/sdk-nestjs-common/lib/utils/extensions/array.extensions';
import { RedisCacheService } from '@multiversx/sdk-nestjs-cache';
import { InMemoryCacheService } from './in.memory.cache.service';

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

    getLocal<T>(key: string): Promise<T | undefined> {
        return this.inMemoryCacheService.get<T>(key);
    }

    getManyLocal<T>(keys: string[]): Promise<(T | undefined)[]> {
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
    ): Promise<void> {
        return this.inMemoryCacheService.setMany(
            keys,
            values,
            ttl,
            cacheNullable,
        );
    }

    deleteLocal(key: string): Promise<void> {
        return this.inMemoryCacheService.delete(key);
    }

    async deleteManyLocal(keys: string[]): Promise<void> {
        await Promise.all(
            keys.map((key) => this.inMemoryCacheService.delete(key)),
        );
    }

    getOrSetLocal<T>(
        key: string,
        createValueFunc: () => Promise<T>,
        ttl: number,
        cacheNullable = true,
    ): Promise<T> {
        return this.inMemoryCacheService.getOrSet<T>(
            key,
            () => {
                return this.executeWithPendingPromise(key, createValueFunc);
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
        return this.inMemoryCacheService.setOrUpdate<T>(
            key,
            createValueFunc,
            ttl,
            cacheNullable,
        );
    }

    getRemote<T>(key: string): Promise<T | undefined> {
        return this.redisCacheService.get<T>(key);
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

    flushDbRemote(): Promise<void> {
        return this.redisCacheService.flushDb();
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

    setOrUpdateRemote<T>(
        key: string,
        createValueFunc: () => Promise<T>,
        ttl: number,
        cacheNullable = true,
    ): Promise<T> {
        return this.redisCacheService.setOrUpdate<T>(
            key,
            createValueFunc,
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

    zRangeRemote(key: string, from: number, to: number): Promise<string[]> {
        return this.redisCacheService.zrange(key, from, to, {
            withScores: true,
        });
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

    decrementRemote(key: string, ttl: number | null = null): Promise<number> {
        return this.redisCacheService.decrement(key, ttl);
    }

    async get<T>(key: string): Promise<T | undefined> {
        const inMemoryCacheValue = await this.inMemoryCacheService.get<T>(key);
        if (inMemoryCacheValue) {
            return inMemoryCacheValue;
        }

        return await this.redisCacheService.get<T>(key);
    }

    async getMany<T>(keys: string[]): Promise<(T | undefined)[]> {
        const values = await this.getManyLocal<T>(keys);

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

    async set<T>(
        key: string,
        value: T,
        ttl: number,
        inMemoryTtl: number = ttl,
        cacheNullable = true,
    ): Promise<void> {
        const setInMemoryCachePromise = this.inMemoryCacheService.set<T>(
            key,
            value,
            inMemoryTtl,
            cacheNullable,
        );
        const setRedisCachePromise = this.redisCacheService.set<T>(
            key,
            value,
            ttl,
            cacheNullable,
        );

        await Promise.all([setInMemoryCachePromise, setRedisCachePromise]);
    }

    async setMany<T>(
        keys: string[],
        values: T[],
        ttl: number,
        cacheNullable = true,
    ): Promise<void> {
        await Promise.all([
            this.setManyRemote(keys, values, ttl, cacheNullable),
            this.setManyLocal(keys, values, ttl, cacheNullable),
        ]);
    }

    async delete(key: string): Promise<void> {
        await this.redisCacheService.delete(key);
        await this.inMemoryCacheService.delete(key);
    }

    async deleteMany(keys: string[]): Promise<void> {
        await this.deleteManyRemote(keys);
        await this.deleteManyLocal(keys);
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

        return await this.inMemoryCacheService.getOrSet<T>(
            key,
            getOrAddFromRedisFunc,
            inMemoryTtl,
            cacheNullable,
        );
    }

    async refreshLocal<T>(
        key: string,
        ttl: number = this.getCacheTtl(),
    ): Promise<T | undefined> {
        const value = await this.getRemote<T>(key);
        if (value) {
            await this.setLocal<T>(key, value, ttl);
        } else {
            this.logger.log(`Deleting local cache key '${key}'`);
            await this.deleteLocal(key);
        }

        return value;
    }

    async batchGetManyRemote<T>(
        keys: string[],
    ): Promise<(T | undefined | null)[]> {
        const chunks = BatchUtils.splitArrayIntoChunks(keys, 100);

        const result = [];

        for (const chunkKeys of chunks) {
            const chunkValues = await this.redisCacheService.getMany<T>(
                chunkKeys,
            );
            result.push(...chunkValues);
        }

        return result;
    }

    async setAddRemote(key: string, ...values: string[]): Promise<void> {
        await this.redisCacheService.sadd(key, ...values);
    }

    async setCountRemote(key: string): Promise<number> {
        return await this.redisCacheService.scard(key);
    }

    async hashGetRemote<T>(hash: string, field: string): Promise<T | null> {
        return await this.redisCacheService.hget<T>(hash, field);
    }

    async hashGetAllRemote(hash: string): Promise<Record<string, any> | null> {
        return await this.redisCacheService.hgetall(hash);
    }

    async hashSetRemote<T>(
        hash: string,
        field: string,
        value: T,
        cacheNullable = true,
    ): Promise<number> {
        return await this.redisCacheService.hset<T>(
            hash,
            field,
            value,
            cacheNullable,
        );
    }

    async hashSetManyRemote(
        hash: string,
        fieldsValues: [string, any][],
        cacheNullable = true,
    ): Promise<number> {
        return await this.redisCacheService.hsetMany(
            hash,
            fieldsValues,
            cacheNullable,
        );
    }

    async hashIncrementRemote(
        hash: string,
        field: string,
        increment: number | string,
    ): Promise<number> {
        return await this.redisCacheService.hincrby(hash, field, increment);
    }

    async hashKeysRemote(hash: string): Promise<string[]> {
        return await this.redisCacheService.hkeys(hash);
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
                await this.deleteLocal(key);
                await this.redisCacheService.delete(key);

                invalidatedKeys.push(key);
            }
        } else {
            await this.deleteLocal(key);
            await this.redisCacheService.delete(key);
            invalidatedKeys.push(key);
        }

        return invalidatedKeys;
    }

    private getCacheTtl(): number {
        return 6;
    }
}
