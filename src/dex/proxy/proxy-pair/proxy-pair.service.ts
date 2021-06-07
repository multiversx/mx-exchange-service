import { Injectable } from '@nestjs/common';
import { ContextService } from '../../utils/context.service';
import { AbiProxyPairService } from './proxy-pair-abi.service';
import { CacheProxyPairService } from 'src/services/cache-manager/cache-proxy-pair.service';
import { NFTTokenModel } from 'src/dex/models/nftToken.model';
import { GenericEsdtAmountPair } from 'src/dex/models/proxy.model';

@Injectable()
export class ProxyPairService {
    constructor(
        private abiService: AbiProxyPairService,
        private cacheService: CacheProxyPairService,
        private context: ContextService,
    ) {}

    async getwrappedLpToken(): Promise<NFTTokenModel> {
        const cachedData = await this.cacheService.getWrappedLpTokenID();
        if (!!cachedData) {
            return await this.context.getNFTTokenMetadata(
                cachedData.wrappedLpTokenID,
            );
        }

        const wrappedLpTokenID = await this.abiService.getWrappedLpTokenID();
        this.cacheService.setWrappedLpTokenID({
            wrappedLpTokenID: wrappedLpTokenID,
        });

        return await this.context.getNFTTokenMetadata(wrappedLpTokenID);
    }

    async getIntermediatedPairs(): Promise<string[]> {
        const cachedData = await this.cacheService.getIntermediatedPairsAddress();
        if (!!cachedData) {
            return cachedData.pairs;
        }

        const pairs = await this.abiService.getIntermediatedPairsAddress();

        this.cacheService.setIntermediatedPairsAddress({
            pairs: pairs,
        });

        return pairs;
    }

    async getTemporaryFundsProxy(
        userAddress: string,
    ): Promise<GenericEsdtAmountPair[]> {
        return await this.abiService.getTemporaryFundsProxy(userAddress);
    }
}
