import { Injectable } from '@nestjs/common';
import { CachingService } from 'src/services/caching/cache.service';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';

@Injectable()
export class LockedAssetSetterService {
    constructor(private readonly cachingService: CachingService) {}

    private getLockedAssetFactoryCacheKey(...args: any) {
        return generateCacheKeyFromParams('lockedAssetFactory', ...args);
    }
}
