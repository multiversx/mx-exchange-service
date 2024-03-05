import { Inject } from '@nestjs/common';
import { CacheService } from '@multiversx/sdk-nestjs-cache';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { ContextTracker } from '@multiversx/sdk-nestjs-common';

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

            return await cachingService.getOrSet(
                cacheKey,
                () => originalMethod.apply(this, args),
                cachingOptions.remoteTtl,
                cachingOptions.localTtl,
            );
        };
        return descriptor;
    };
}
