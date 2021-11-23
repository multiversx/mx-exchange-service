import { Injectable } from '@nestjs/common';
import { oneMinute } from 'src/helpers/helpers';
import { CachingService } from 'src/services/caching/cache.service';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';

@Injectable()
export class LockedAssetSetterService {
    constructor(private readonly cachingService: CachingService) {}

    async setBurnedTokenAmount(
        tokenID: string,
        value: string,
    ): Promise<string> {
        const cacheKey = this.getLockedAssetFactoryCacheKey(
            `${tokenID}.burnedTokenAmount`,
        );
        await this.cachingService.setCache(cacheKey, value, oneMinute());
        return cacheKey;
    }

    private getLockedAssetFactoryCacheKey(...args: any) {
        return generateCacheKeyFromParams('lockedAssetFactory', ...args);
    }
}
