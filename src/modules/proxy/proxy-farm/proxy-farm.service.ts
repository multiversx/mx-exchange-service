import { Injectable } from '@nestjs/common';
import { ContextService } from '../../../services/context/context.service';
import { CacheProxyFarmService } from '../../../services/cache-manager/cache-proxy-farm.service';
import { AbiProxyFarmService } from './proxy-farm-abi.service';
import { NftToken } from 'src/models/tokens/nftToken.model';

@Injectable()
export class ProxyFarmService {
    constructor(
        private abiService: AbiProxyFarmService,
        private cacheService: CacheProxyFarmService,
        private context: ContextService,
    ) {}

    async getwrappedFarmToken(): Promise<NftToken> {
        const cachedData = await this.cacheService.getWrappedFarmTokenID();
        if (!!cachedData) {
            return this.context.getNftTokenMetadata(
                cachedData.wrappedFarmTokenID,
            );
        }

        const wrappedFarmTokenID = await this.abiService.getWrappedFarmTokenID();
        this.cacheService.setWrappedFarmTokenID({
            wrappedFarmTokenID: wrappedFarmTokenID,
        });

        return this.context.getNftTokenMetadata(wrappedFarmTokenID);
    }

    async getIntermediatedFarms(): Promise<string[]> {
        const cachedData = await this.cacheService.getIntermediatedFarmsAddress();
        if (!!cachedData) {
            return cachedData.farms;
        }

        const farms = await this.abiService.getIntermediatedFarmsAddress();

        this.cacheService.setIntermediatedFarmsAddress({
            farms: farms,
        });

        return farms;
    }
}
