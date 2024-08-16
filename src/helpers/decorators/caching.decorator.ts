import { Inject } from '@nestjs/common';
import { CacheService } from '@multiversx/sdk-nestjs-cache';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { ContextTracker } from '@multiversx/sdk-nestjs-common';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';
import {
    formatNullOrUndefined,
    parseCachedNullOrUndefined,
} from 'src/utils/cache.utils';

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

            const cachedValue = await cachingService.get(cacheKey);

            if (cachedValue !== undefined) {
                return parseCachedNullOrUndefined(cachedValue);
            }

            if (process.env.ENABLE_CACHE_WARMER === 'false') {
                console.log('Cache miss for key:', cacheKey);
            }

            const value = await originalMethod.apply(this, args);

            let { remoteTtl, localTtl } = cachingOptions;

            if (typeof value === 'undefined' || value === null) {
                remoteTtl = CacheTtlInfo.NullValue.remoteTtl;
                localTtl = CacheTtlInfo.NullValue.localTtl;
            }

            await cachingService.set(
                cacheKey,
                formatNullOrUndefined(value),
                remoteTtl,
                localTtl,
            );

            return value;
        };
        return descriptor;
    };
}
