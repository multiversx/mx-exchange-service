import { Injectable } from '@nestjs/common';
import { AbiProxyService } from './proxy-abi.service';
import { CacheProxyService } from '../../services/cache-manager/cache-proxy.service';
import {
    ProxyModel,
    WrappedFarmTokenAttributesModel,
    WrappedLpTokenAttributesModel,
} from '../../models/proxy.model';
import { scAddress } from '../../config';
import {
    decodeWrappedFarmTokenAttributes,
    decodeWrappedLPTokenAttributes,
} from './utils';
import { ElrondApiService } from '../../services/elrond-communication/elrond-api.service';
import { FarmService } from '../farm/farm.service';
import { DecodeAttributesArgs } from './dto/proxy.args';
import { ContextService } from '../../services/context/context.service';
import { EsdtToken } from 'src/models/tokens/esdtToken.model';
import { NftCollection } from 'src/models/tokens/nftCollection.model';

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

    async getAssetToken(): Promise<EsdtToken> {
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

    async getlockedAssetToken(): Promise<NftCollection> {
        const cachedData = await this.cacheService.getLockedAssetTokenID();
        if (!!cachedData) {
            return await this.context.getNftCollectionMetadata(
                cachedData.lockedAssetTokenID,
            );
        }

        const lockedAssetTokenID = await this.abiService.getLockedAssetTokenID();

        this.cacheService.setLockedAssetTokenID({
            lockedAssetTokenID: lockedAssetTokenID,
        });

        return await this.context.getNftCollectionMetadata(lockedAssetTokenID);
    }

    getWrappedLpTokenAttributes(
        args: DecodeAttributesArgs,
    ): WrappedLpTokenAttributesModel[] {
        return args.batchAttributes.map(arg => {
            const decodedAttributes = decodeWrappedLPTokenAttributes(
                arg.attributes,
            );

            return {
                identifier: arg.identifier,
                attributes: arg.attributes,
                lpTokenID: decodedAttributes.lpTokenID.toString(),
                lpTokenTotalAmount: decodedAttributes.lpTokenTotalAmount.toFixed(),
                lockedAssetsInvested: decodedAttributes.lockedAssetsInvested.toFixed(),
                lockedAssetsNonce: decodedAttributes.lockedAssetsNonce.toString(),
            };
        });
    }

    async getWrappedFarmTokenAttributes(
        args: DecodeAttributesArgs,
    ): Promise<WrappedFarmTokenAttributesModel[]> {
        const promises = args.batchAttributes.map(async arg => {
            const decodedAttributes = decodeWrappedFarmTokenAttributes(
                arg.attributes,
            );

            const farmToken = await this.apiService.getNftByTokenIdentifier(
                scAddress.proxyDexAddress,
                decodedAttributes.farmTokenIdentifier,
            );
            const decodedFarmAttributes = await this.farmService.decodeFarmTokenAttributes(
                decodedAttributes.farmTokenIdentifier,
                farmToken.attributes,
            );

            const decodedWrappedFarmTokenAttributes: WrappedFarmTokenAttributesModel = {
                identifier: arg.identifier,
                attributes: arg.attributes,
                farmTokenID: decodedAttributes.farmTokenID.toString(),
                farmTokenNonce: decodedAttributes.farmTokenNonce,
                farmTokenAmount: decodedAttributes.farmTokenAmount,
                farmTokenIdentifier: decodedAttributes.farmTokenIdentifier,
                farmTokenAttributes: decodedFarmAttributes,
                farmingTokenID: decodedAttributes.farmingTokenID.toString(),
                farmingTokenNonce: decodedAttributes.farmingTokenNonce,
                farmingTokenAmount: decodedAttributes.farmingTokenAmount,
            };
            return decodedWrappedFarmTokenAttributes;
        });

        return Promise.all(promises);
    }
}
