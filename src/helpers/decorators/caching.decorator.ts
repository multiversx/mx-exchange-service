import { Inject } from '@nestjs/common';
import { CacheService } from 'src/services/caching/cache.service';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { ContextTracker } from '@multiversx/sdk-nestjs-common';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';
import {
    formatNullOrUndefined,
    parseCachedNullOrUndefined,
} from 'src/utils/cache.utils';
import { MetricsCollector } from 'src/utils/metrics.collector';

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

            const genericCacheKey = generateCacheKeyFromParams(
                cachingOptions.baseKey,
                propertyKey,
            );

            if (context && context.deepHistoryTimestamp) {
                cacheKey = `${cacheKey}.${context.deepHistoryTimestamp}`;
            }

            const cachingService: CacheService = this.cachingService;

            const locallyCachedValue = cachingService.getLocal(cacheKey);
            if (locallyCachedValue !== undefined) {
                MetricsCollector.incrementLocalCacheHit(genericCacheKey);

                return parseCachedNullOrUndefined(locallyCachedValue);
            }

            const cachedValue = await cachingService.getRemote(cacheKey);
            if (cachedValue !== undefined) {
                MetricsCollector.incrementCachedApiHit(genericCacheKey);

                cachingService.setLocal(
                    cacheKey,
                    cachedValue,
                    cachingOptions.localTtl ??
                        Math.floor(cachingOptions.remoteTtl / 2),
                );
                return parseCachedNullOrUndefined(cachedValue);
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

            MetricsCollector.incrementCacheMiss(genericCacheKey);

            return value;
        };
        return descriptor;
    };
}
