import { CacheService } from 'src/services/caching/cache.service';
import { parseCachedNullOrUndefined } from './cache.utils';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';

const DEFAULT_MISS_CONCURRENCY = 10;

export async function getAllKeys<T>(
    cacheService: CacheService,
    rawKeys: string[],
    baseKey: string,
    getterMethod: (address: string) => Promise<T>,
    ttlOptions?: CacheTtlInfo,
    concurrency: number = DEFAULT_MISS_CONCURRENCY,
): Promise<T[]> {
    const keys = rawKeys.map((tokenID) => `${baseKey}.${tokenID}`);
    const values = await cacheService.getMany<T>(
        keys,
        ttlOptions?.localTtl ?? 0,
    );

    const missingIndexes: number[] = [];
    values.forEach((value, index) => {
        if (value === undefined || value === null) {
            missingIndexes.push(index);
        } else {
            values[index] = parseCachedNullOrUndefined(value);
        }
    });

    // Misses are resolved in bounded parallel. Resolving them one at a time
    // made every batch helper degrade to fully sequential I/O on a cold cache,
    // while an unbounded fan-out would flood the gateway - a getter miss can
    // fall through to a VM query.
    let cursor = 0;
    const workers = Array.from(
        { length: Math.min(concurrency, missingIndexes.length) },
        async () => {
            while (cursor < missingIndexes.length) {
                const missingIndex = missingIndexes[cursor++];
                values[missingIndex] = await getterMethod(
                    rawKeys[missingIndex],
                );
            }
        },
    );

    await Promise.all(workers);

    return values;
}
