import { Injectable } from '@nestjs/common';
import { CacheManagerService } from '../../services/cache-manager/cache-manager.service';
import { cacheConfig } from '../../config';

const Keys = {
    wrappedLpTokenID: () => 'wrappedLpTokenID',
    intermediatedPairsAddress: () => 'intermediatedPairsAddresses',
};

@Injectable()
export class CacheProxyPairService {
    constructor(private cacheManagerService: CacheManagerService) {}

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
}
