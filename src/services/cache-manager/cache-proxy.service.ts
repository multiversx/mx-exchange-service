import { Injectable } from '@nestjs/common';
import { CacheManagerService } from '../../services/cache-manager/cache-manager.service';
import { cacheConfig } from '../../config';

const Keys = {
    lockedAssetTokenID: () => 'lockedAssetTokenID',
};

@Injectable()
export class CacheProxyService {
    constructor(private cacheManagerService: CacheManagerService) {}

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
