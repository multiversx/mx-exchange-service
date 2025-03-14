import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Constants } from '@multiversx/sdk-nestjs-common';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { Logger } from 'winston';
import { CacheService } from 'src/services/caching/cache.service';
import { GenericSetterService } from '../generics/generic.setter.service';

@Injectable()
export class ContextSetterService extends GenericSetterService {
    constructor(
        protected readonly cachingService: CacheService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
    ) {
        super(cachingService, logger);
    }

    async setCurrentEpoch(value: number): Promise<string> {
        const cacheKey = this.getContextCacheKey('currentEpoch');
        return await this.setData(cacheKey, value, Constants.oneSecond() * 12);
    }

    async setShardCurrentBlockNonce(
        shardID: number,
        value: number,
    ): Promise<string> {
        const cacheKey = this.getContextCacheKey('shardBlockNonce', shardID);
        return await this.setData(cacheKey, value, Constants.oneSecond() * 12);
    }

    private getContextCacheKey(...args: any) {
        return generateCacheKeyFromParams('context', ...args);
    }
}
