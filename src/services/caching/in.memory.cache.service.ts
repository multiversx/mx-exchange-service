import { Injectable } from '@nestjs/common';
import TTLCache from '@isaacs/ttlcache';
import { mxConfig } from 'src/config';

@Injectable()
export class InMemoryCacheService {
    private static localCache: TTLCache<any, any>;
    constructor() {
        if (!InMemoryCacheService.localCache) {
            InMemoryCacheService.localCache = new TTLCache({
                max: mxConfig.localCacheMaxItems,
                ttl: 6000,
                updateAgeOnGet: false,
            });
        }
    }

    get<T>(key: string): T | undefined {
        const data = InMemoryCacheService.localCache.get(key);

        const parsedData = data
            ? data.serialized === true
                ? JSON.parse(data.value)
                : data.value
            : undefined;

        return parsedData;
    }

    getMany<T>(keys: string[]): (T | undefined)[] {
        return keys.map((key) => this.get<T>(key));
    }

    getKeyCount(): number {
        return InMemoryCacheService.localCache.size;
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

    setMany<T>(
        keys: string[],
        values: T[],
        ttl: number,
        cacheNullable = true,
    ): void {
        for (const [index, key] of keys.entries()) {
            this.set(key, values[index], ttl, cacheNullable);
        }
    }

    delete(key: string): void {
        InMemoryCacheService.localCache.delete(key);
    }

    async getOrSet<T>(
        key: string,
        createValueFunc: () => Promise<T>,
        ttl: number,
        cacheNullable = true,
    ): Promise<T> {
        const cachedData = this.get<any>(key);
        if (cachedData !== undefined) {
            return cachedData;
        }

        const internalCreateValueFunc =
            this.buildInternalCreateValueFunc<T>(createValueFunc);
        const value = await internalCreateValueFunc();
        this.set<T>(key, value, ttl, cacheNullable);
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
