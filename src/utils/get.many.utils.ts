import { CacheService } from 'src/services/caching/cache.service';
import { parseCachedNullOrUndefined } from './cache.utils';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';

export async function getAllKeys<T>(
    cacheService: CacheService,
    rawKeys: string[],
    baseKey: string,
    getterMethod: (address: string) => Promise<T>,
    ttlOptions?: CacheTtlInfo,
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

    for (const missingIndex of missingIndexes) {
        const tokenID = await getterMethod(rawKeys[missingIndex]);
        values[missingIndex] = tokenID;
    }

    return values;
}
