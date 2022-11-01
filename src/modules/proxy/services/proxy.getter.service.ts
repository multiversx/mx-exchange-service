import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import { NftCollection } from 'src/modules/tokens/models/nftCollection.model';
import { TokenGetterService } from 'src/modules/tokens/services/token.getter.service';
import { CachingService } from 'src/services/caching/cache.service';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';
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
        this.baseKey = 'proxy';
    }

    async getAssetTokenID(proxyAddress: string): Promise<string> {
        return await this.getData(
            this.getCacheKey('assetTokenID'),
            () => this.abiService.getAssetTokenID(proxyAddress),
            CacheTtlInfo.Token.remoteTtl,
            CacheTtlInfo.Token.localTtl,
        );
    }

    async getLockedAssetTokenID(proxyAddress: string): Promise<string> {
        return this.getData(
            this.getCacheKey('lockedAssetTokenID'),
            () => this.abiService.getLockedAssetTokenID(proxyAddress),
            CacheTtlInfo.Token.remoteTtl,
            CacheTtlInfo.Token.localTtl,
        );
    }

    async getAssetToken(proxyAddress: string): Promise<EsdtToken> {
        const assetTokenID = await this.getAssetTokenID(proxyAddress);
        return this.tokenGetter.getTokenMetadata(assetTokenID);
    }

    async getlockedAssetToken(proxyAddress: string): Promise<NftCollection> {
        const lockedAssetTokenID = await this.getLockedAssetTokenID(
            proxyAddress,
        );
        return this.tokenGetter.getNftCollectionMetadata(lockedAssetTokenID);
    }
}
