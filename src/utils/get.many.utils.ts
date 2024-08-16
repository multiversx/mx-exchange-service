import { CacheService } from '@multiversx/sdk-nestjs-cache';

async function getMany<T>(
    cacheService: CacheService,
    keys: string[],
): Promise<(T | undefined)[]> {
    const values = await cacheService.getManyLocal<T>(keys);

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

    if (missingKeys.length === 0) {
        return values;
    }

    const remoteValues = await cacheService.getManyRemote<T>(missingKeys);

    for (const [index, missingIndex] of missingIndexes.entries()) {
        const remoteValue = remoteValues[index];
        values[missingIndex] = remoteValue ? remoteValue : undefined;
    }

    return values;
}

export async function getAllKeys<T>(
    cacheService: CacheService,
    rawKeys: string[],
    baseKey: string,
    getterMethod: (address: string) => Promise<T>,
): Promise<T[]> {
    const keys = rawKeys.map((tokenID) => `${baseKey}.${tokenID}`);
    const values = await getMany<T>(cacheService, keys);

    const missingIndexes: number[] = [];
    values.forEach((value, index) => {
        if (!value) {
            missingIndexes.push(index);
        }
    });

    for (const missingIndex of missingIndexes) {
        const tokenID = await getterMethod(rawKeys[missingIndex]);
        values[missingIndex] = tokenID;
    }
    return values;
}
