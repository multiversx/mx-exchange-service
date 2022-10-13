import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { oneSecond } from 'src/helpers/helpers';
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
        this.baseKey = 'context';
    }

    async setCurrentEpoch(value: number): Promise<string> {
        const cacheKey = this.getCacheKey('currentEpoch');
        return await this.setData(cacheKey, value, oneSecond() * 12);
    }

    async setShardCurrentBlockNonce(
        shardID: number,
        value: number,
    ): Promise<string> {
        const cacheKey = this.getCacheKey('shardBlockNonce', shardID);
        return await this.setData(cacheKey, value, oneSecond() * 12);
    }
}
