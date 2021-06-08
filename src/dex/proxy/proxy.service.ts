import { Injectable } from '@nestjs/common';
import { ContextService } from '../utils/context.service';
import { TokenModel } from '../models/esdtToken.model';
import { AbiProxyService } from './proxy-abi.service';
import { CacheProxyService } from '../../services/cache-manager/cache-proxy.service';
import {
    ProxyModel,
    WrappedFarmTokenAttributesModel,
    WrappedLpTokenAttributesModel,
} from '../models/proxy.model';
import { scAddress } from '../../config';
import {
    decodeWrappedFarmTokenAttributes,
    decodeWrappedLPTokenAttributes,
} from './utils';
import { NFTTokenModel } from '../models/nftToken.model';
import { ElrondApiService } from '../../services/elrond-communication/elrond-api.service';
import { FarmService } from '../farm/farm.service';

@Injectable()
export class ProxyService {
    constructor(
        private apiService: ElrondApiService,
        private abiService: AbiProxyService,
        private cacheService: CacheProxyService,
        private context: ContextService,
        private farmService: FarmService,
    ) {}

    async getProxyInfo(): Promise<ProxyModel> {
        const proxy = new ProxyModel();
        proxy.address = scAddress.proxyDexAddress;
        return proxy;
    }

    async getAssetToken(): Promise<TokenModel> {
        const cachedData = await this.cacheService.getAssetTokenID();
        if (!!cachedData) {
            return await this.context.getTokenMetadata(cachedData.assetTokenID);
        }

        const assetTokenID = await this.abiService.getAssetTokenID();

        this.cacheService.setAssetTokenID({
            assetTokenID: assetTokenID,
        });

        return await this.context.getTokenMetadata(assetTokenID);
    }

    async getlockedAssetToken(): Promise<NFTTokenModel> {
        const cachedData = await this.cacheService.getLockedAssetTokenID();
        if (!!cachedData) {
            return await this.context.getNFTTokenMetadata(
                cachedData.lockedAssetTokenID,
            );
        }

        const lockedAssetTokenID = await this.abiService.getLockedAssetTokenID();

        this.cacheService.setLockedAssetTokenID({
            lockedAssetTokenID: lockedAssetTokenID,
        });

        return await this.context.getNFTTokenMetadata(lockedAssetTokenID);
    }

    async getWrappedLpTokenAttributes(
        batchAttributes: string[],
    ): Promise<WrappedLpTokenAttributesModel[]> {
        return batchAttributes.map(attributes => {
            const decodedAttributes = decodeWrappedLPTokenAttributes(
                attributes,
            );

            return {
                attributes: attributes,
                lpTokenID: decodedAttributes.lpTokenID.toString(),
                lpTokenTotalAmount: decodedAttributes.lpTokenTotalAmount.toString(),
                lockedAssetsInvested: decodedAttributes.lockedAssetsInvested.toString(),
                lockedAssetsNonce: decodedAttributes.lockedAssetsNonce.toString(),
            };
        });
    }

    async getWrappedFarmTokenAttributes(
        batchAttributes: string[],
    ): Promise<WrappedFarmTokenAttributesModel[]> {
        const promises = batchAttributes.map(async attributes => {
            const decodedAttributes = decodeWrappedFarmTokenAttributes(
                attributes,
            );

            const farmToken = await this.apiService.getNftByTokenIdentifier(
                scAddress.proxyDexAddress,
                decodedAttributes.farmTokenIdentifier,
            );
            const decodedFarmAttributes = await this.farmService.decodeFarmTokenAttributes(
                farmToken.attributes,
            );

            return {
                attributes: attributes,
                farmTokenID: decodedAttributes.farmTokenID.toString(),
                farmTokenNonce: decodedAttributes.farmTokenNonce,
                farmTokenIdentifier: decodedAttributes.farmTokenIdentifier,
                farmTokenAttributes: decodedFarmAttributes,
                farmedTokenID: decodedAttributes.farmedTokenID.toString(),
                farmedTokenNonce: decodedAttributes.farmedTokenNonce,
            };
        });

        return Promise.all(promises);
    }
}
