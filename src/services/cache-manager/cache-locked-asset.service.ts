import { Injectable } from '@nestjs/common';
import { CacheManagerService } from '../../services/cache-manager/cache-manager.service';
import { cacheConfig } from '../../config';

const Keys = {
    lockedTokenID: () => 'lockedTokenID',
    milestones: () => 'milestones',
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

    async getMilestones(): Promise<Record<string, any>> {
        return this.cacheManagerService.get(Keys.milestones());
    }

    async setMilestones(milestones: Record<string, any>): Promise<void> {
        await this.cacheManagerService.set(
            Keys.milestones(),
            milestones,
            cacheConfig.default,
        );
    }
}
