import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { oneHour } from 'src/helpers/helpers';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import { NftCollection } from 'src/modules/tokens/models/nftCollection.model';
import { TokenGetterService } from 'src/modules/tokens/services/token.getter.service';
import { CachingService } from 'src/services/caching/cache.service';
import { GenericGetterService } from 'src/services/generics/generic.getter.service';

import { Logger } from 'winston';
import { AbiProxyService } from './proxy-abi.service';

@Injectable()
export class ProxyGetterService extends GenericGetterService {
    constructor(
        protected readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
        private readonly abiService: AbiProxyService,
        private readonly tokenGetter: TokenGetterService,
    ) {
        super(cachingService, logger);
    }

    async getAssetTokenID(): Promise<string> {
        return await this.getData(
            this.getProxyCacheKey('assetTokenID'),
            () => this.abiService.getAssetTokenID(),
            oneHour(),
        );
    }

    async getLockedAssetTokenID(): Promise<string> {
        return this.getData(
            this.getProxyCacheKey('lockedAssetTokenID'),
            () => this.abiService.getLockedAssetTokenID(),
            oneHour(),
        );
    }

    async getAssetToken(): Promise<EsdtToken> {
        const assetTokenID = await this.getAssetTokenID();
        return this.tokenGetter.getTokenMetadata(assetTokenID);
    }

    async getlockedAssetToken(): Promise<NftCollection> {
        const lockedAssetTokenID = await this.getLockedAssetTokenID();
        return this.tokenGetter.getNftCollectionMetadata(lockedAssetTokenID);
    }

    private getProxyCacheKey(...args: any) {
        return this.getCacheKey('proxy', ...args);
    }
}
