import { generateSetLogMessage } from 'src/utils/generate-log-message';
import { Logger } from 'winston';
import { CachingService } from '../caching/cache.service';
import { CacheKeyGenerator } from './cache-key-generator';
import { RedisPubSub } from 'graphql-redis-subscriptions';

export class GenericSetterService extends CacheKeyGenerator {
    constructor(
        protected readonly cachingService: CachingService,
        protected readonly logger: Logger,
    ) {
        super(logger);
    }

    protected async setData(
        cacheKey: string,
        value: any,
        remoteTtl: number,
        localTtl?: number,
    ): Promise<string> {
        try {
            await this.cachingService.setCache(
                cacheKey,
                value,
                remoteTtl,
                localTtl,
            );
            return cacheKey;
        } catch (error) {
            const logMessage = generateSetLogMessage(
                this.constructor.name,
                this.setData.name,
                cacheKey,
                error.message,
            );
            this.logger.error(logMessage);
            throw error;
        }
    }

    //TODO: SERVICES-770
    protected async deleteCacheKeys(pubSub: RedisPubSub, invalidatedKeys: string[]): Promise<void> {
        await pubSub.publish('deleteCacheKeys', invalidatedKeys);
    }
}
