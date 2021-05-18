import { Injectable } from '@nestjs/common';
import { CacheManagerService } from '../../services/cache-manager/cache-manager.service';
import { cacheConfig } from '../../config';

const Keys = {
    distributedTokenID: () => 'distributedTokenID',
    lockedTokenID: () => 'lockedTokenID',
    epoch: () => 'epoch',
    amount: () => 'amount',
    milestones: () => 'milestones',
};

@Injectable()
export class CacheDistributionService {
    constructor(private cacheManagerService: CacheManagerService) {}

    async getDistributedTokenID(): Promise<Record<string, any>> {
        return this.cacheManagerService.get(Keys.distributedTokenID());
    }

    async setDistributedTokenID(
        distributedTokenID: Record<string, any>,
    ): Promise<void> {
        await this.cacheManagerService.set(
            Keys.distributedTokenID(),
            distributedTokenID,
            cacheConfig.token,
        );
    }

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

    async getEpoch(): Promise<Record<string, any>> {
        return this.cacheManagerService.get(Keys.epoch());
    }

    async setEpoch(epoch: Record<string, any>): Promise<void> {
        await this.cacheManagerService.set(
            Keys.epoch(),
            epoch,
            cacheConfig.default,
        );
    }

    async getAmount(): Promise<Record<string, any>> {
        return this.cacheManagerService.get(Keys.amount());
    }

    async setAmount(amount: Record<string, any>): Promise<void> {
        await this.cacheManagerService.set(
            Keys.amount(),
            amount,
            cacheConfig.default,
        );
    }
}
