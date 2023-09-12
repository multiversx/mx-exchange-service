import { generateGetLogMessage } from 'src/utils/generate-log-message';
import { Logger } from 'winston';
import { CacheService } from '@multiversx/sdk-nestjs-cache';
import { generateCacheKeyFromParams } from '../../utils/generate-cache-key';

export class GenericGetterService {
    protected baseKey: string | undefined;
    constructor(
        protected readonly cachingService: CacheService,
        protected readonly logger: Logger,
    ) {}

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

    protected getCacheKey(...args: any) {
        if (!this.baseKey) {
            this.logger.error('baseKey was not set');
        }
        return generateCacheKeyFromParams(this.baseKey, ...args);
    }
}
