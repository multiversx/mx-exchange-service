import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { oneHour } from 'src/helpers/helpers';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import { NftCollection } from 'src/modules/tokens/models/nftCollection.model';
import { CachingService } from 'src/services/caching/cache.service';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { GenericGetterService } from 'src/services/generics/generic.getter.service';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { Logger } from 'winston';
import { UnlockMileStoneModel } from '../models/locked-asset.model';
import { AbiLockedAssetService } from './abi-locked-asset.service';

@Injectable()
export class LockedAssetGetterService extends GenericGetterService {
    constructor(
        protected readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
        private readonly abiService: AbiLockedAssetService,
        private readonly contextGetter: ContextGetterService,
    ) {
        super(cachingService, logger);
    }

    async getAssetTokenID(): Promise<string> {
        return await this.getData(
            this.getLockedAssetFactoryCacheKey('assetTokenID'),
            () => this.abiService.getAssetTokenID(),
            oneHour(),
        );
    }

    async getLockedTokenID(): Promise<string> {
        return await this.getData(
            this.getLockedAssetFactoryCacheKey('lockedTokenID'),
            () => this.abiService.getLockedTokenID(),
            oneHour(),
        );
    }

    async getAssetToken(): Promise<EsdtToken> {
        const assetTokenID = await this.getAssetTokenID();
        return await this.contextGetter.getTokenMetadata(assetTokenID);
    }

    async getLockedToken(): Promise<NftCollection> {
        const lockedTokenID = await this.getLockedTokenID();
        return await this.contextGetter.getNftCollectionMetadata(lockedTokenID);
    }

    async getDefaultUnlockPeriod(): Promise<UnlockMileStoneModel[]> {
        return await this.getData(
            this.getLockedAssetFactoryCacheKey('defaultUnlockPeriod'),
            () => this.abiService.getDefaultUnlockPeriod(),
            oneHour(),
        );
    }

    async getInitEpoch(): Promise<number> {
        return await this.getData(
            this.getLockedAssetFactoryCacheKey('initEpoch'),
            () => this.abiService.getInitEpoch(),
            oneHour(),
        );
    }

    async getExtendedAttributesActivationNonce(): Promise<number> {
        return await this.getData(
            this.getLockedAssetFactoryCacheKey(
                'extendedAttributesActivationNonce',
            ),
            () => this.abiService.getExtendedAttributesActivationNonce(),
            oneHour(),
        );
    }

    private getLockedAssetFactoryCacheKey(...args: any) {
        return generateCacheKeyFromParams('lockedAssetFactory', ...args);
    }
}
