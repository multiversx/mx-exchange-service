import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { generateSetLogMessage } from 'src/utils/generate-log-message';
import { Logger } from 'winston';
import { CachingService } from '../caching/cache.service';
import { generateCacheKeyFromParams } from '../../utils/generate-cache-key';

@Injectable()
export class GenericSetterService {
    protected baseKey: string | undefined;
    constructor(
        protected readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
    ) {}

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

    protected getCacheKey(...args: any) {
        if (!this.baseKey) {
            this.logger.error('baseKey was not set');
        }
        return generateCacheKeyFromParams(this.baseKey, ...args);
    }
}
