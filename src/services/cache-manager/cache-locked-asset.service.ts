import { Injectable } from '@nestjs/common';
import { CacheManagerService } from '../../services/cache-manager/cache-manager.service';
import { cacheConfig } from '../../config';

const Keys = {
    lockedTokenID: () => 'lockedTokenID',
};

@Injectable()
export class CacheLockedAssetService {
    constructor(private cacheManagerService: CacheManagerService) {}

    async getLockedTokenID(): Promise<Record<string, any>> {
        return this.cacheManagerService.get(Keys.lockedTokenID());
    }

    async setLockedTokenID(lockedTokenID: Record<string, any>): Promise<void> {
        await this.cacheManagerService.set(
            Keys.lockedTokenID(),
            lockedTokenID,
            cacheConfig.token,
        );
    }
}
