import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { CachingService } from 'src/services/caching/cache.service';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';
import { MXApiService } from 'src/services/multiversx-communication/mx.api.service';
import { GenericGetterService } from 'src/services/generics/generic.getter.service';
import { Logger } from 'winston';
import { EsdtToken } from '../models/esdtToken.model';
import { NftCollection } from '../models/nftCollection.model';
import { TokenComputeService } from './token.compute.service';
import { TokenRepositoryService } from './token.repository.service';

@Injectable()
export class TokenGetterService extends GenericGetterService {
    constructor(
        protected readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
        private readonly tokenRepositoryService: TokenRepositoryService,
        @Inject(forwardRef(() => TokenComputeService))
        private readonly tokenCompute: TokenComputeService,
        private readonly apiService: MXApiService,
    ) {
        super(cachingService, logger);
        this.baseKey = 'token';
    }

    async getTokenMetadata(tokenID: string): Promise<EsdtToken> {
        if (tokenID === undefined) {
            return undefined;
        }
        const cacheKey = this.getCacheKey(tokenID);
        return await this.getData(
            cacheKey,
            () => this.apiService.getToken(tokenID),
            CacheTtlInfo.Token.remoteTtl,
            CacheTtlInfo.Token.localTtl,
        );
    }

    async getNftCollectionMetadata(collection: string): Promise<NftCollection> {
        const cacheKey = this.getCacheKey(collection);
        return await this.getData(
            cacheKey,
            () => this.apiService.getNftCollection(collection),
            CacheTtlInfo.Token.remoteTtl,
            CacheTtlInfo.Token.localTtl,
        );
    }

    async getEsdtTokenType(tokenID: string): Promise<string> {
        return await this.getData(
            this.getCacheKey(tokenID, 'type'),
            () => this.tokenRepositoryService.getTokenType(tokenID),
            CacheTtlInfo.Token.remoteTtl,
            CacheTtlInfo.Token.localTtl,
        );
    }

    async getDerivedEGLD(tokenID: string): Promise<string> {
        return await this.getData(
            this.getCacheKey(tokenID, 'derivedEGLD'),
            () => this.tokenCompute.computeTokenPriceDerivedEGLD(tokenID),
            CacheTtlInfo.Price.remoteTtl,
            CacheTtlInfo.Price.localTtl,
        );
    }

    async getDerivedUSD(tokenID: string): Promise<string> {
        return await this.getData(
            this.getCacheKey(tokenID, 'derivedUSD'),
            () => this.tokenCompute.computeTokenPriceDerivedUSD(tokenID),
            CacheTtlInfo.Price.remoteTtl,
            CacheTtlInfo.Price.localTtl,
        );
    }
}
