import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { generateSetLogMessage } from 'src/utils/generate-log-message';
import { Logger } from 'winston';
import { CacheService } from '@multiversx/sdk-nestjs-cache';
import { generateCacheKeyFromParams } from '../../utils/generate-cache-key';

@Injectable()
export class GenericSetterService {
    protected baseKey: string | undefined;
    constructor(
        protected readonly cachingService: CacheService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
    ) {}

    protected async setData(
        cacheKey: string,
        value: any,
        remoteTtl: number,
        localTtl?: number,
    ): Promise<string> {
        await this.cachingService.set(cacheKey, value, remoteTtl, localTtl);
        return cacheKey;
    }

    protected async delData(cacheKey: string): Promise<string> {
        try {
            await this.cachingService.deleteInCache(cacheKey);
            return cacheKey;
        } catch (error) {
            const logMessage = generateSetLogMessage(
                this.constructor.name,
                this.delData.name,
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
