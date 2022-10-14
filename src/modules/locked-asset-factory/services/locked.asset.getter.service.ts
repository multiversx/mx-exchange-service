import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { oneHour } from 'src/helpers/helpers';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import { NftCollection } from 'src/modules/tokens/models/nftCollection.model';
import { TokenGetterService } from 'src/modules/tokens/services/token.getter.service';
import { CachingService } from 'src/services/caching/cache.service';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';
import { GenericGetterService } from 'src/services/generics/generic.getter.service';
import { Logger } from 'winston';
import { UnlockMileStoneModel } from '../models/locked-asset.model';
import { AbiLockedAssetService } from './abi-locked-asset.service';

@Injectable()
export class LockedAssetGetterService extends GenericGetterService {
    constructor(
        protected readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
        private readonly abiService: AbiLockedAssetService,
        private readonly tokenGetter: TokenGetterService,
    ) {
        super(cachingService, logger);
        this.baseKey = 'lockedAssetFactory';
    }

    async getAssetTokenID(): Promise<string> {
        return await this.getData(
            this.getCacheKey('assetTokenID'),
            () => this.abiService.getAssetTokenID(),
            CacheTtlInfo.Token.remoteTtl,
            CacheTtlInfo.Token.localTtl,
        );
    }

    async getLockedTokenID(): Promise<string> {
        return await this.getData(
            this.getCacheKey('lockedTokenID'),
            () => this.abiService.getLockedTokenID(),
            CacheTtlInfo.Token.remoteTtl,
            CacheTtlInfo.Token.localTtl,
        );
    }

    async getAssetToken(): Promise<EsdtToken> {
        const assetTokenID = await this.getAssetTokenID();
        return await this.tokenGetter.getTokenMetadata(assetTokenID);
    }

    async getLockedToken(): Promise<NftCollection> {
        const lockedTokenID = await this.getLockedTokenID();
        return await this.tokenGetter.getNftCollectionMetadata(lockedTokenID);
    }

    async getDefaultUnlockPeriod(): Promise<UnlockMileStoneModel[]> {
        return await this.getData(
            this.getCacheKey('defaultUnlockPeriod'),
            () => this.abiService.getDefaultUnlockPeriod(),
            oneHour(),
        );
    }

    async getInitEpoch(): Promise<number> {
        return await this.getData(
            this.getCacheKey('initEpoch'),
            () => this.abiService.getInitEpoch(),
            oneHour(),
        );
    }

    async getExtendedAttributesActivationNonce(): Promise<number> {
        return await this.getData(
            this.getCacheKey(
                'extendedAttributesActivationNonce',
            ),
            () => this.abiService.getExtendedAttributesActivationNonce(),
            oneHour(),
        );
    }
}
