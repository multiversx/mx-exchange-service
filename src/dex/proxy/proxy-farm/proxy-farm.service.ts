import { Injectable } from '@nestjs/common';
import { TokenModel } from 'src/dex/models/pair.model';
import { CacheProxyFarmService } from 'src/services/cache-manager/cache-proxy-farm.service';
import { ContextService } from '../../utils/context.service';
import { AbiProxyFarmService } from './proxy-farm-abi.service';

@Injectable()
export class ProxyFarmService {
    constructor(
        private abiService: AbiProxyFarmService,
        private cacheService: CacheProxyFarmService,
        private context: ContextService,
    ) {}

    async getwrappedFarmToken(): Promise<TokenModel> {
        const cachedData = await this.cacheService.getWrappedFarmTokenID();
        if (!!cachedData) {
            return this.context.getTokenMetadata(cachedData.wrappedFarmTokenID);
        }

        const wrappedFarmTokenID = await this.abiService.getWrappedFarmTokenID();
        this.cacheService.setWrappedFarmTokenID({
            wrappedFarmTokenID: wrappedFarmTokenID,
        });

        return this.context.getTokenMetadata(wrappedFarmTokenID);
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
