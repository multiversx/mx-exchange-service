import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Constants } from '@multiversx/sdk-nestjs-common';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import { NftCollection } from 'src/modules/tokens/models/nftCollection.model';
import { CacheService } from 'src/services/caching/cache.service';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';
import { GenericGetterService } from 'src/services/generics/generic.getter.service';
import { Logger } from 'winston';
import { UnlockMileStoneModel } from '../models/locked-asset.model';
import { AbiLockedAssetService } from './abi-locked-asset.service';
import { TokenService } from 'src/modules/tokens/services/token.service';

@Injectable()
export class LockedAssetGetterService extends GenericGetterService {
    constructor(
        protected readonly cachingService: CacheService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
        private readonly abiService: AbiLockedAssetService,
        private readonly tokenService: TokenService,
    ) {
        super(cachingService, logger);
        this.baseKey = 'lockedAssetFactory';
    }

    async getAssetTokenID(): Promise<string> {
        return this.getData(
            this.getCacheKey('assetTokenID'),
            () => this.abiService.getAssetTokenID(),
            CacheTtlInfo.TokenID.remoteTtl,
            CacheTtlInfo.TokenID.localTtl,
        );
    }

    async getLockedTokenID(): Promise<string> {
        return this.getData(
            this.getCacheKey('lockedTokenID'),
            () => this.abiService.getLockedTokenID(),
            CacheTtlInfo.TokenID.remoteTtl,
            CacheTtlInfo.TokenID.localTtl,
        );
    }

    async getAssetToken(): Promise<EsdtToken> {
        const assetTokenID = await this.getAssetTokenID();
        return this.tokenService.tokenMetadata(assetTokenID);
    }

    async getLockedToken(): Promise<NftCollection> {
        const lockedTokenID = await this.getLockedTokenID();
        return this.tokenService.getNftCollectionMetadata(lockedTokenID);
    }

    async getDefaultUnlockPeriod(): Promise<UnlockMileStoneModel[]> {
        return this.getData(
            this.getCacheKey('defaultUnlockPeriod'),
            () => this.abiService.getDefaultUnlockPeriod(),
            Constants.oneHour(),
        );
    }

    async getInitEpoch(): Promise<number> {
        return this.getData(
            this.getCacheKey('initEpoch'),
            () => this.abiService.getInitEpoch(),
            Constants.oneHour(),
        );
    }

    async getExtendedAttributesActivationNonce(): Promise<number> {
        return this.getData(
            this.getCacheKey('extendedAttributesActivationNonce'),
            () => this.abiService.getExtendedAttributesActivationNonce(),
            Constants.oneHour(),
        );
    }
}
