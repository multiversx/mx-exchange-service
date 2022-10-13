import { Inject, Injectable } from '@nestjs/common';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { oneHour } from 'src/helpers/helpers';
import { CachingService } from 'src/services/caching/cache.service';
import { GenericSetterService } from 'src/services/generics/generic.setter.service';
import { PUB_SUB } from 'src/services/redis.pubSub.module';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { Logger } from 'winston';

@Injectable()
export class FlagsSetterService extends GenericSetterService {
    constructor(
        protected readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
        @Inject(PUB_SUB) protected pubSub: RedisPubSub,
    ) {
        super(cachingService, logger);
        this.baseKey = 'flag'
    }

    async setFlag(name: string, value: boolean): Promise<string> {
        return await this.setData(this.getFlagCacheKey(name), value, oneHour());
    }

    async deleteFlag(name: string): Promise<void> {
        const cacheKey = this.getFlagCacheKey(name);
        await this.cachingService.deleteInCache(cacheKey);
        await this.deleteCacheKeys(this.pubSub, [cacheKey]);
    }

    private getFlagCacheKey(flagName: string, ...args: any) {
        return generateCacheKeyFromParams('', flagName, ...args);
    }
}
