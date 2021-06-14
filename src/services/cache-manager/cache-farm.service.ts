import { Injectable } from '@nestjs/common';
import { cacheConfig } from '../../config';
import { CacheManagerService } from './cache-manager.service';

const Keys = {
    farmedTokenID: (farmAddress: string) => `${farmAddress}.farmedTokenID`,
    farmTokenID: (farmAddress: string) => `${farmAddress}.farmTokenID`,
    farmingTokenID: (farmAddress: string) => `${farmAddress}.farmingTokenID`,
    farmTokenSupply: (farmAddress: string) => `${farmAddress}.farmTokenSupply`,
    farmingTokenReserve: (farmAddress: string) =>
        `${farmAddress}.farmingTokenReserve`,
    rewardsPerBlock: (farmAddress: string) => `${farmAddress}.rewardsPerBlock`,
};

@Injectable()
export class CacheFarmService {
    constructor(private cacheManagerService: CacheManagerService) {}

    async getFarmedTokenID(farmAddress: string): Promise<Record<string, any>> {
        return this.cacheManagerService.get(Keys.farmedTokenID(farmAddress));
    }

    async setFarmedTokenID(
        farmAddress: string,
        farmedTokenID: Record<string, any>,
    ): Promise<void> {
        await this.cacheManagerService.set(
            Keys.farmedTokenID(farmAddress),
            farmedTokenID,
            cacheConfig.token,
        );
    }

    async getFarmTokenID(farmAddress: string): Promise<Record<string, any>> {
        return this.cacheManagerService.get(Keys.farmTokenID(farmAddress));
    }

    async setFarmTokenID(
        farmAddress: string,
        farmTokenID: Record<string, any>,
    ): Promise<void> {
        await this.cacheManagerService.set(
            Keys.farmTokenID(farmAddress),
            farmTokenID,
            cacheConfig.token,
        );
    }

    async getFarmingTokenID(farmAddress: string): Promise<Record<string, any>> {
        return this.cacheManagerService.get(Keys.farmingTokenID(farmAddress));
    }

    async setFarmingTokenID(
        farmAddress: string,
        farmingTokenID: Record<string, any>,
    ): Promise<void> {
        await this.cacheManagerService.set(
            Keys.farmingTokenID(farmAddress),
            farmingTokenID,
            cacheConfig.token,
        );
    }

    async getFarmTokenSupply(
        farmAddress: string,
    ): Promise<Record<string, any>> {
        return this.cacheManagerService.get(Keys.farmTokenSupply(farmAddress));
    }

    async setFarmTokenSupply(
        farmAddress: string,
        farmTokenSupply: Record<string, any>,
    ): Promise<void> {
        await this.cacheManagerService.set(
            Keys.farmTokenSupply(farmAddress),
            farmTokenSupply,
            cacheConfig.reserves,
        );
    }

    async getFarmingTokenReserve(
        farmAddress: string,
    ): Promise<Record<string, any>> {
        return this.cacheManagerService.get(
            Keys.farmingTokenReserve(farmAddress),
        );
    }

    async setFarmingTokenReserve(
        farmAddress: string,
        farmingTokenReserve: Record<string, any>,
    ): Promise<void> {
        await this.cacheManagerService.set(
            Keys.farmingTokenReserve(farmAddress),
            farmingTokenReserve,
            cacheConfig.reserves,
        );
    }

    async getRewardsPerBlock(
        farmAddress: string,
    ): Promise<Record<string, any>> {
        return this.cacheManagerService.get(Keys.rewardsPerBlock(farmAddress));
    }

    async setRewardsPerBlock(
        farmAddress: string,
        rewardsPerBlock: Record<string, any>,
    ): Promise<void> {
        await this.cacheManagerService.set(
            Keys.rewardsPerBlock(farmAddress),
            rewardsPerBlock,
            cacheConfig.reserves,
        );
    }
}
