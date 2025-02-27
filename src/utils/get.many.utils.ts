import { CacheService } from 'src/services/caching/cache.service';
import { parseCachedNullOrUndefined } from './cache.utils';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';

async function getMany<T>(
    cacheService: CacheService,
    keys: string[],
    localTtl: number,
): Promise<(T | undefined)[]> {
    const values = cacheService.getManyLocal<T>(keys);

    const missingIndexes: number[] = [];
    values.forEach((value, index) => {
        if (value === undefined) {
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

    const remoteValues = await cacheService.getManyRemote<T>(missingKeys);

    if (localTtl > 0) {
        cacheService.setManyLocal<T>(
            missingKeys,
            remoteValues.map((value) =>
                value ? parseCachedNullOrUndefined(value) : undefined,
            ),
            localTtl,
        );
    }

    for (const [index, missingIndex] of missingIndexes.entries()) {
        values[missingIndex] = remoteValues[index];
    }

    return values;
}

export async function getAllKeys<T>(
    cacheService: CacheService,
    rawKeys: string[],
    baseKey: string,
    getterMethod: (address: string) => Promise<T>,
    ttlOptions?: CacheTtlInfo,
): Promise<T[]> {
    const keys = rawKeys.map((tokenID) => `${baseKey}.${tokenID}`);
    const values = await getMany<T>(
        cacheService,
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
