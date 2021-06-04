import { Injectable } from '@nestjs/common';
import { ContextService } from '../utils/context.service';
import { TokenModel } from 'src/dex/models/pair.model';
import { AbiProxyService } from './proxy-abi.service';
import { CacheProxyService } from 'src/services/cache-manager/cache-proxy.service';
import {
    ProxyModel,
    WrappedFarmTokenAttributesModel,
    WrappedLpTokenAttributesModel,
} from '../models/proxy.model';
import { scAddress } from 'src/config';
import {
    decodeWrappedFarmTokenAttributes,
    decodeWrappedLPTokenAttributes,
} from './utils';

@Injectable()
export class ProxyService {
    constructor(
        private abiService: AbiProxyService,
        private cacheService: CacheProxyService,
        private context: ContextService,
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

    async getlockedAssetToken(): Promise<TokenModel> {
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
        attributes: string,
    ): Promise<WrappedLpTokenAttributesModel> {
        const decodedAttributes = decodeWrappedLPTokenAttributes(attributes);

        return {
            lpTokenID: decodedAttributes.lpTokenID.toString(),
            lpTokenTotalAmount: decodedAttributes.lpTokenTotalAmount.toString(),
            lockedAssetsInvested: decodedAttributes.lockedAssetsInvested.toString(),
            lockedAssetsNonce: decodedAttributes.lockedAssetsNonce.toString(),
        };
    }

    async getWrappedFarmTokenAttributes(
        attributes: string,
    ): Promise<WrappedFarmTokenAttributesModel> {
        const decodedAttributes = decodeWrappedFarmTokenAttributes(attributes);

        return {
            farmTokenID: decodedAttributes.farmTokenID.toString(),
            farmTokenNonce: decodedAttributes.farmTokenNonce.toString(),
            farmedTokenID: decodedAttributes.farmedTokenID.toString(),
            farmedTokenNonce: decodedAttributes.farmedTokenNonce.toString(),
        };
    }
}
