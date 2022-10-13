import { generateGetLogMessage } from 'src/utils/generate-log-message';
import { Logger } from 'winston';
import { CachingService } from '../caching/cache.service';
import { CacheKeyGenerator } from './cache-key-generator';

export class GenericGetterService extends CacheKeyGenerator{
    constructor(
        protected readonly cachingService: CachingService,
        protected readonly logger: Logger
    ) {
        super(logger);
    }

    protected async getData(
        cacheKey: string,
        createValueFunc: () => any,
        remoteTtl: number,
        localTtl?: number,
    ): Promise<any> {
        try {
            return await this.cachingService.getOrSet(
                cacheKey,
                createValueFunc,
                remoteTtl,
                localTtl,
            );
        } catch (error) {
            const logMessage = generateGetLogMessage(
                this.constructor.name,
                createValueFunc.name,
                cacheKey,
                error.message,
            );
            this.logger.error(logMessage);
            throw error;
        }
    }
}
