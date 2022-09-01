import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { oneHour, oneSecond } from 'src/helpers/helpers';
import { CachingService } from 'src/services/caching/cache.service';
import { GenericSetterService } from 'src/services/generics/generic.setter.service';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { Logger } from 'winston';
import { EsdtToken } from '../models/esdtToken.model';
import { NftCollection } from '../models/nftCollection.model';

@Injectable()
export class TokenSetterService extends GenericSetterService {
    constructor(
        protected readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
    ) {
        super(cachingService, logger);
    }

    async setTokenMetadata(tokenID: string, value: EsdtToken): Promise<string> {
        const cacheKey = this.getTokenCacheKey(tokenID);
        return await this.setData(cacheKey, value, oneHour());
    }

    async setNftCollectionMetadata(
        collection: string,
        value: NftCollection,
    ): Promise<string> {
        const cacheKey = this.getTokenCacheKey(collection);
        return await this.setData(cacheKey, value, oneHour());
    }

    async setDerivedEGLD(tokenID: string, value: string): Promise<string> {
        return await this.setData(
            this.getTokenCacheKey(tokenID, 'derivedEGLD'),
            value,
            oneSecond() * 12,
        );
    }

    async setDerivedUSD(tokenID: string, value: string): Promise<string> {
        return await this.setData(
            this.getTokenCacheKey(tokenID, 'derivedUSD'),
            value,
            oneSecond() * 12,
        );
    }

    private getTokenCacheKey(tokenID: string, ...args: any): string {
        return generateCacheKeyFromParams('token', tokenID, args);
    }
}
