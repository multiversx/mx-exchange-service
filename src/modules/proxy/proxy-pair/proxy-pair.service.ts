import { Injectable } from '@nestjs/common';
import { AbiProxyPairService } from './proxy-pair-abi.service';
import { CacheProxyPairService } from '../../../services/cache-manager/cache-proxy-pair.service';
import { GenericEsdtAmountPair } from '../../../models/proxy.model';
import { ContextService } from '../../../services/context/context.service';
import { NftCollection } from 'src/models/tokens/nftCollection.model';

@Injectable()
export class ProxyPairService {
    constructor(
        private abiService: AbiProxyPairService,
        private cacheService: CacheProxyPairService,
        private context: ContextService,
    ) {}

    async getwrappedLpTokenID(): Promise<string> {
        const cachedData = await this.cacheService.getWrappedLpTokenID();
        if (!!cachedData) {
            return cachedData.wrappedLpTokenID;
        }

        const wrappedLpTokenID = await this.abiService.getWrappedLpTokenID();
        this.cacheService.setWrappedLpTokenID({
            wrappedLpTokenID: wrappedLpTokenID,
        });
        return wrappedLpTokenID;
    }

    async getwrappedLpToken(): Promise<NftCollection> {
        const wrappedLpTokenID = await this.getwrappedLpTokenID();
        return await this.context.getNftCollectionMetadata(wrappedLpTokenID);
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
