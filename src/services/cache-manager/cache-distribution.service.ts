import { Injectable } from '@nestjs/common';
import { CacheManagerService } from '../../services/cache-manager/cache-manager.service';
import { cacheConfig } from '../../config';

const Keys = {
    distributedTokenID: () => 'distributedTokenID',
    lockedTokenID: () => 'lockedTokenID',
    wrappedLpTokenID: () => 'wrappedLpTokenID',
    wrappedFarmTokenID: () => 'wrappedFarmTokenID',
    acceptedLockedTokensID: () => 'acceptedLockedTokensID',
    intermediatedPairsAddress: () => 'intermediatedPairsAddresses',
    intermediatedFarmsAddress: () => 'intermediatedFarmsAddresses',
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

    async getWrappedLpTokenID(): Promise<Record<string, any>> {
        return this.cacheManagerService.get(Keys.wrappedLpTokenID());
    }

    async setWrappedLpTokenID(
        wrappedLpTokenID: Record<string, any>,
    ): Promise<void> {
        await this.cacheManagerService.set(
            Keys.wrappedLpTokenID(),
            wrappedLpTokenID,
            cacheConfig.token,
        );
    }

    async getWrappedFarmTokenID(): Promise<Record<string, any>> {
        return this.cacheManagerService.get(Keys.wrappedFarmTokenID());
    }

    async setWrappedFarmTokenID(
        wrappedFarmTokenID: Record<string, any>,
    ): Promise<void> {
        await this.cacheManagerService.set(
            Keys.wrappedFarmTokenID(),
            wrappedFarmTokenID,
            cacheConfig.token,
        );
    }

    async getAcceptedLockedTokensID(): Promise<Record<string, any>> {
        return this.cacheManagerService.get(Keys.acceptedLockedTokensID());
    }

    async setAcceptedLockedTokensID(
        acceptedLockedTokensID: Record<string, any>,
    ): Promise<void> {
        await this.cacheManagerService.set(
            Keys.acceptedLockedTokensID(),
            acceptedLockedTokensID,
            cacheConfig.tokens,
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

    async getIntermediatedPairsAddress(): Promise<Record<string, any>> {
        return this.cacheManagerService.get(Keys.intermediatedPairsAddress());
    }

    async setIntermediatedPairsAddress(
        intermediatedPairsAddress: Record<string, any>,
    ): Promise<void> {
        await this.cacheManagerService.set(
            Keys.intermediatedPairsAddress(),
            intermediatedPairsAddress,
            cacheConfig.default,
        );
    }

    async getIntermediatedFarmsAddress(): Promise<Record<string, any>> {
        return this.cacheManagerService.get(Keys.intermediatedFarmsAddress());
    }

    async setIntermediatedFarmsAddress(
        intermediatedFarmsAddress: Record<string, any>,
    ): Promise<void> {
        await this.cacheManagerService.set(
            Keys.intermediatedFarmsAddress(),
            intermediatedFarmsAddress,
            cacheConfig.default,
        );
    }
}
