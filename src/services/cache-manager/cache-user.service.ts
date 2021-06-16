import { Injectable } from '@nestjs/common';
import { CacheManagerService } from '../../services/cache-manager/cache-manager.service';
import { cacheConfig } from '../../config';

const Keys = {
    ESDTTokens: (userAddress: string) => `esdtToken.${userAddress}`,
    NFTTokens: (userAddress: string) => `nftToken.${userAddress}`,
};

@Injectable()
export class CacheUserService {
    constructor(private cacheManagerService: CacheManagerService) {}

    async getESDTTokens(userAddress: string): Promise<Record<string, any>> {
        return this.cacheManagerService.get(Keys.ESDTTokens(userAddress));
    }

    async setESDTTokens(
        userAddress: string,
        esdtTokens: Record<string, any>,
    ): Promise<void> {
        await this.cacheManagerService.set(
            Keys.ESDTTokens(userAddress),
            esdtTokens,
            cacheConfig.userTokens,
        );
    }

    async getNFTTokens(userAddress: string): Promise<Record<string, any>> {
        return this.cacheManagerService.get(Keys.NFTTokens(userAddress));
    }

    async setNFTTokens(
        userAddress: string,
        nftTokens: Record<string, any>,
    ): Promise<void> {
        await this.cacheManagerService.set(
            Keys.NFTTokens(userAddress),
            nftTokens,
            cacheConfig.userTokens,
        );
    }
}
