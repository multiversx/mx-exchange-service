import { Inject } from '@nestjs/common';
import { CacheService } from '@multiversx/sdk-nestjs-cache';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { ContextTracker } from '@multiversx/sdk-nestjs-common';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';

export interface ICachingOptions {
    baseKey: string;
    remoteTtl: number;
    localTtl?: number;
}

export function GetOrSetCache(cachingOptions: ICachingOptions) {
    const cachingServiceInjector = Inject(CacheService);

    return function (
        target: any,
        propertyKey: string,
        descriptor: PropertyDescriptor,
    ) {
        cachingServiceInjector(target, 'cachingService');
        const originalMethod = descriptor.value;

        descriptor.value = async function (...args: any[]) {
            const context = ContextTracker.get();

            let cacheKey = generateCacheKeyFromParams(
                cachingOptions.baseKey,
                propertyKey,
                ...args,
            );

            if (context && context.deepHistoryTimestamp) {
                cacheKey = `${cacheKey}.${context.deepHistoryTimestamp}`;
            }

            const cachingService: CacheService = this.cachingService;

            let cachedValue = await cachingService.get(cacheKey);

            if (cachedValue !== undefined) {
                cachedValue = cachedValue === 'null' ? null : cachedValue;
                cachedValue =
                    cachedValue === 'undefined' ? undefined : cachedValue;

                return cachedValue;
            }

            const value = await originalMethod.apply(this, args);

            let { remoteTtl, localTtl } = cachingOptions;

            if (typeof value === 'undefined' || value === null) {
                remoteTtl = CacheTtlInfo.NullValue.remoteTtl;
                localTtl = CacheTtlInfo.NullValue.localTtl;
            }

            cachedValue = typeof value === 'undefined' ? 'undefined' : value;
            cachedValue = cachedValue === null ? 'null' : cachedValue;

            await cachingService.set(
                cacheKey,
                cachedValue,
                remoteTtl,
                localTtl,
            );

            return value;
        };
        return descriptor;
    };
}
