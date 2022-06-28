import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { oneMinute } from 'src/helpers/helpers';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import { NftCollection } from 'src/modules/tokens/models/nftCollection.model';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { Logger } from 'winston';
import { CachingService } from '../caching/cache.service';
import { GenericSetterService } from '../generics/generic.setter.service';

@Injectable()
export class ContextSetterService extends GenericSetterService {
    constructor(
        protected readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
    ) {
        super(cachingService, logger);
    }

    async setTokenMetadata(tokenID: string, value: EsdtToken): Promise<string> {
        const cacheKey = this.getContextCacheKey(tokenID);
        return await this.setData(cacheKey, value, oneMinute() * 2);
    }

    async setNftCollectionMetadata(
        collection: string,
        value: NftCollection,
    ): Promise<string> {
        const cacheKey = this.getContextCacheKey(collection);
        return await this.setData(cacheKey, value, oneMinute() * 2);
    }

    private getContextCacheKey(...args: any) {
        return generateCacheKeyFromParams('context', ...args);
    }
}
