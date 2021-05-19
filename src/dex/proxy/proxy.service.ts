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
import { elrondConfig } from 'src/config';
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
        proxy.address = elrondConfig.proxyDexAddress;
        return proxy;
    }

    private async getAcceptedLockedTokensMap(
        acceptedLockedTokensID: string[],
    ): Promise<TokenModel[]> {
        const acceptedLockedTokens: TokenModel[] = [];
        for (const tokenID of acceptedLockedTokensID) {
            const token = await this.context.getTokenMetadata(tokenID);
            acceptedLockedTokens.push(token);
        }
        return acceptedLockedTokens;
    }

    async getAcceptedLockedAssetsTokens(): Promise<TokenModel[]> {
        const cachedData = await this.cacheService.getAcceptedLockedTokensID();
        if (!!cachedData) {
            return this.getAcceptedLockedTokensMap(
                cachedData.acceptedLockedTokensID,
            );
        }

        const acceptedLockedTokensID = await this.abiService.getAcceptedLockedTokensID();

        this.cacheService.setAcceptedLockedTokensID({
            acceptedLockedTokensID: acceptedLockedTokensID,
        });

        return await this.getAcceptedLockedTokensMap(acceptedLockedTokensID);
    }

    async getWrappedLpTokenAttributes(
        attributes: string,
    ): Promise<WrappedLpTokenAttributesModel> {
        const decodedAttributes = decodeWrappedLPTokenAttributes(attributes);

        return {
            lpTokenID: decodedAttributes.lpTokenID.toString(),
            lpTokenTotalAmount: decodedAttributes.lpTokenTotalAmount.toString(),
            lockedAssetsTokenID: decodedAttributes.lockedAssetsTokenID.toString(),
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
