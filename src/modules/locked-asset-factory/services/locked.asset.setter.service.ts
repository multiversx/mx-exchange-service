import { Injectable } from '@nestjs/common';
import { CacheService } from '@multiversx/sdk-nestjs-cache';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';

@Injectable()
export class LockedAssetSetterService {
    constructor(private readonly cachingService: CacheService) {}

    private getLockedAssetFactoryCacheKey(...args: any) {
        return generateCacheKeyFromParams('lockedAssetFactory', ...args);
    }
}
