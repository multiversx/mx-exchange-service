import { Inject, Injectable } from '@nestjs/common';
import { AbiProxyPairService } from './proxy-pair-abi.service';
import { NftCollection } from 'src/modules/tokens/models/nftCollection.model';
import { CachingService } from 'src/services/caching/cache.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { oneHour } from 'src/helpers/helpers';
import { GenericGetterService } from 'src/services/generics/generic.getter.service';
import { TokenGetterService } from 'src/modules/tokens/services/token.getter.service';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';

@Injectable()
export class ProxyPairGetterService extends GenericGetterService {
    constructor(
        protected readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
        private abiService: AbiProxyPairService,
        private readonly tokenGetter: TokenGetterService,
    ) {
        super(cachingService, logger);
        this.baseKey = 'proxyPair';
    }

    async getwrappedLpTokenID(): Promise<string> {
        return await this.getData(
            this.getCacheKey('wrappedLpTokenID'),
            () => this.abiService.getWrappedLpTokenID(),
            CacheTtlInfo.Token.remoteTtl,
            CacheTtlInfo.Token.localTtl,
        );
    }

    async getwrappedLpToken(): Promise<NftCollection> {
        const wrappedLpTokenID = await this.getwrappedLpTokenID();
        return await this.tokenGetter.getNftCollectionMetadata(
            wrappedLpTokenID,
        );
    }

    async getIntermediatedPairs(): Promise<string[]> {
        return await this.getData(
            this.getCacheKey('intermediatedPairs'),
            () => this.abiService.getIntermediatedPairsAddress(),
            oneHour(),
        );
    }
}
