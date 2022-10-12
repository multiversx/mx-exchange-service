import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { oneHour, oneSecond } from 'src/helpers/helpers';
import { CachingService } from 'src/services/caching/cache.service';
import { ElrondApiService } from 'src/services/elrond-communication/elrond-api.service';
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
        private readonly apiService: ElrondApiService,
    ) {
        super(cachingService, logger);
    }

    async getTokenMetadata(tokenID: string): Promise<EsdtToken> {
        if (tokenID === undefined) {
            return undefined;
        }
        const cacheKey = this.getTokenCacheKey(tokenID);
        return await this.getData(
            cacheKey,
            () => this.apiService.getToken(tokenID),
            oneHour(),
        );
    }

    async getNftCollectionMetadata(collection: string): Promise<NftCollection> {
        const cacheKey = this.getTokenCacheKey(collection);
        return await this.getData(
            cacheKey,
            () => this.apiService.getNftCollection(collection),
            oneHour(),
        );
    }

    async getEsdtTokenType(tokenID: string): Promise<string> {
        return await this.getData(
            this.getTokenCacheKey(tokenID, 'type'),
            () => this.tokenRepositoryService.getTokenType(tokenID),
            oneHour(),
        );
    }

    async getDerivedEGLD(tokenID: string): Promise<string> {
        return await this.getData(
            this.getTokenCacheKey(tokenID, 'derivedEGLD'),
            () => this.tokenCompute.computeTokenPriceDerivedEGLD(tokenID),
            oneSecond() * 12,
        );
    }

    async getDerivedUSD(tokenID: string): Promise<string> {
        return await this.getData(
            this.getTokenCacheKey(tokenID, 'derivedUSD'),
            () => this.tokenCompute.computeTokenPriceDerivedUSD(tokenID),
            oneSecond() * 12,
        );
    }

    private getTokenCacheKey(tokenID: string, ...args: any): string {
        return this.getCacheKey('token', tokenID, ...args);
    }
}
