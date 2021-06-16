import { Injectable } from '@nestjs/common';
import { CacheManagerService } from '../../services/cache-manager/cache-manager.service';
import { cacheConfig } from '../../config';

const Keys = {
    assetTokenID: () => 'assetTokenID',
    lockedAssetTokenID: () => 'lockedAssetTokenID',
};

@Injectable()
export class CacheProxyService {
    constructor(private cacheManagerService: CacheManagerService) {}

    async getAssetTokenID(): Promise<Record<string, any>> {
        return this.cacheManagerService.get(Keys.assetTokenID());
    }

    async setAssetTokenID(
        distributedTokenID: Record<string, any>,
    ): Promise<void> {
        return this.cacheManagerService.set(
            Keys.assetTokenID(),
            distributedTokenID,
            cacheConfig.tokens,
        );
    }

    async getLockedAssetTokenID(): Promise<Record<string, any>> {
        return this.cacheManagerService.get(Keys.lockedAssetTokenID());
    }

    async setLockedAssetTokenID(
        lockedAssetTokenID: Record<string, any>,
    ): Promise<void> {
        await this.cacheManagerService.set(
            Keys.lockedAssetTokenID(),
            lockedAssetTokenID,
            cacheConfig.tokens,
        );
    }
}
