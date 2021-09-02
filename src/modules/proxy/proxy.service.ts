import { Inject, Injectable } from '@nestjs/common';
import { AbiProxyService } from './proxy-abi.service';
import { ProxyModel } from './models/proxy.model';
import { WrappedLpTokenAttributesModel } from './models/wrappedLpTokenAttributes.model';
import { WrappedFarmTokenAttributesModel } from './models/wrappedFarmTokenAttributes.model';
import { scAddress } from '../../config';
import {
    decodeWrappedFarmTokenAttributes,
    decodeWrappedLPTokenAttributes,
} from './utils';
import { ElrondApiService } from '../../services/elrond-communication/elrond-api.service';
import { FarmService } from '../farm/farm.service';
import { DecodeAttributesArgs } from './models/proxy.args';
import { ContextService } from '../../services/context/context.service';
import { EsdtToken } from '../../models/tokens/esdtToken.model';
import { NftCollection } from '../../models/tokens/nftCollection.model';
import { CachingService } from '../../services/caching/cache.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { generateCacheKeyFromParams } from '../../utils/generate-cache-key';
import { generateGetLogMessage } from '../../utils/generate-log-message';
import { oneHour } from '../../helpers/helpers';

@Injectable()
export class ProxyService {
    constructor(
        private apiService: ElrondApiService,
        private abiService: AbiProxyService,
        private context: ContextService,
        private farmService: FarmService,
        private readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async getProxyInfo(): Promise<ProxyModel> {
        return new ProxyModel({ address: scAddress.proxyDexAddress });
    }

    private async getTokenID(
        tokenCacheKey: string,
        createValueFunc: () => any,
    ): Promise<string> {
        const cacheKey = this.getProxyCacheKey(tokenCacheKey);
        try {
            return this.cachingService.getOrSet(
                cacheKey,
                createValueFunc,
                oneHour(),
            );
        } catch (error) {
            const logMessage = generateGetLogMessage(
                ProxyService.name,
                this.getTokenID.name,
                cacheKey,
                error,
            );
            this.logger.error(logMessage);
            throw error;
        }
    }

    async getAssetTokenID(): Promise<string> {
        return this.getTokenID('assetTokenID', () =>
            this.abiService.getAssetTokenID(),
        );
    }

    async getLockedAssetTokenID(): Promise<string> {
        return this.getTokenID('lockedAssetTokenID', () =>
            this.abiService.getLockedAssetTokenID(),
        );
    }

    async getAssetToken(): Promise<EsdtToken> {
        const assetTokenID = await this.getAssetTokenID();
        return this.context.getTokenMetadata(assetTokenID);
    }

    async getlockedAssetToken(): Promise<NftCollection> {
        const lockedAssetTokenID = await this.getLockedAssetTokenID();
        return this.context.getNftCollectionMetadata(lockedAssetTokenID);
    }

    getWrappedLpTokenAttributes(
        args: DecodeAttributesArgs,
    ): WrappedLpTokenAttributesModel[] {
        return args.batchAttributes.map(arg => {
            const decodedAttributes = decodeWrappedLPTokenAttributes(
                arg.attributes,
            );

            return new WrappedLpTokenAttributesModel({
                identifier: arg.identifier,
                attributes: arg.attributes,
                lpTokenID: decodedAttributes.lpTokenID.toString(),
                lpTokenTotalAmount: decodedAttributes.lpTokenTotalAmount.toFixed(),
                lockedAssetsInvested: decodedAttributes.lockedAssetsInvested.toFixed(),
                lockedAssetsNonce: decodedAttributes.lockedAssetsNonce.toString(),
            });
        });
    }

    async getWrappedFarmTokenAttributes(
        args: DecodeAttributesArgs,
    ): Promise<WrappedFarmTokenAttributesModel[]> {
        const promises = args.batchAttributes.map(async arg => {
            const decodedAttributes = decodeWrappedFarmTokenAttributes(
                arg.attributes,
            );

            const farmToken = await this.context.getNftMetadata(
                decodedAttributes.farmTokenIdentifier,
            );
            const decodedFarmAttributes = this.farmService.decodeFarmTokenAttributes(
                decodedAttributes.farmTokenIdentifier,
                farmToken.attributes,
            );

            return new WrappedFarmTokenAttributesModel({
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
            });
        });

        return Promise.all(promises);
    }

    private getProxyCacheKey(...args: any) {
        return generateCacheKeyFromParams('proxy', ...args);
    }
}
