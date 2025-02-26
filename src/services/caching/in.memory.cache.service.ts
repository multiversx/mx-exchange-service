import LRU from 'lru-cache';
import { Injectable } from '@nestjs/common';

@Injectable()
export class InMemoryCacheService {
    private static localCache: LRU<any, any>;
    constructor() {
        if (!InMemoryCacheService.localCache) {
            InMemoryCacheService.localCache = new LRU({
                max: 10000,
                allowStale: false,
                updateAgeOnGet: false,
                updateAgeOnHas: false,
            });
        }
    }

    get<T>(key: string): Promise<T | undefined> {
        const data = InMemoryCacheService.localCache.get(key);

        const parsedData = data
            ? data.serialized === true
                ? JSON.parse(data.value)
                : data.value
            : undefined;

        return parsedData;
    }

    getMany<T>(keys: string[]): Promise<(T | undefined)[]> {
        return Promise.all(keys.map((key) => this.get<T>(key)));
    }

    set<T>(key: string, value: T, ttl: number, cacheNullable = true): void {
        if (value === undefined) {
            return;
        }

        if (!cacheNullable && value == null) {
            return;
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

        const ttlToMilliseconds = ttl * 1000; // Convert to milliseconds

        if (ttlToMilliseconds > 0) {
            // Save only if ttl is greater than 0
            InMemoryCacheService.localCache.set(key, writeValue, {
                ttl: ttlToMilliseconds,
            });
        }
    }

    async setMany<T>(
        keys: string[],
        values: T[],
        ttl: number,
        cacheNullable = true,
    ): Promise<void> {
        for (const [index, key] of keys.entries()) {
            this.set(key, values[index], ttl, cacheNullable);
        }
    }

    async delete(key: string): Promise<void> {
        await InMemoryCacheService.localCache.delete(key);
    }

    async getOrSet<T>(
        key: string,
        createValueFunc: () => Promise<T>,
        ttl: number,
        cacheNullable = true,
    ): Promise<T> {
        const cachedData = await this.get<any>(key);
        if (cachedData !== undefined) {
            return cachedData;
        }

        const internalCreateValueFunc =
            this.buildInternalCreateValueFunc<T>(createValueFunc);
        const value = await internalCreateValueFunc();
        await this.set<T>(key, value, ttl, cacheNullable);
        return value;
    }

    async setOrUpdate<T>(
        key: string,
        createValueFunc: () => Promise<T>,
        ttl: number,
        cacheNullable = true,
    ): Promise<T> {
        const internalCreateValueFunc =
            this.buildInternalCreateValueFunc(createValueFunc);
        const value = await internalCreateValueFunc();
        await this.set<T>(key, value, ttl, cacheNullable);
        return value;
    }

    private buildInternalCreateValueFunc<T>(
        createValueFunc: () => Promise<T>,
    ): () => Promise<T> {
        return () => {
            return createValueFunc();
        };
    }
}
