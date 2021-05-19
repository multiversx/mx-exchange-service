import { Injectable } from '@nestjs/common';
import { CacheManagerService } from '../../services/cache-manager/cache-manager.service';
import { cacheConfig } from '../../config';

const Keys = {
    wrappedFarmTokenID: () => 'wrappedFarmTokenID',
    intermediatedFarmsAddress: () => 'intermediatedFarmsAddresses',
};

@Injectable()
export class CacheProxyFarmService {
    constructor(private cacheManagerService: CacheManagerService) {}

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
