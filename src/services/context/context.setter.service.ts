import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { oneHour, oneSecond } from 'src/helpers/helpers';
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

    async setCurrentEpoch(value: number): Promise<string> {
        const cacheKey = this.getContextCacheKey('currentEpoch');
        return await this.setData(cacheKey, value, oneSecond() * 12);
    }

    async setShardCurrentBlockNonce(
        shardID: number,
        value: number,
    ): Promise<string> {
        const cacheKey = this.getContextCacheKey('shardBlockNonce', shardID);
        return await this.setData(cacheKey, value, oneSecond() * 12);
    }

    private getContextCacheKey(...args: any) {
        return generateCacheKeyFromParams('context', ...args);
    }
}
