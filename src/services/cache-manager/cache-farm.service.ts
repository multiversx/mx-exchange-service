import { Injectable } from '@nestjs/common';
import { cacheConfig } from '../../config';
import { CacheManagerService } from './cache-manager.service';

const Keys = {
    farmedTokenID: (farmAddress: string) => `${farmAddress}.farmedTokenID`,
    farmTokenID: (farmAddress: string) => `${farmAddress}.farmTokenID`,
    acceptedTokenID: (farmAddress: string) => `${farmAddress}.acceptedTokenID`,
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

    async getAcceptedTokenID(
        farmAddress: string,
    ): Promise<Record<string, any>> {
        return this.cacheManagerService.get(Keys.acceptedTokenID(farmAddress));
    }

    async setAcceptedTokenID(
        farmAddress: string,
        acceptedTokenID: Record<string, any>,
    ): Promise<void> {
        await this.cacheManagerService.set(
            Keys.acceptedTokenID(farmAddress),
            acceptedTokenID,
            cacheConfig.token,
        );
    }
}
