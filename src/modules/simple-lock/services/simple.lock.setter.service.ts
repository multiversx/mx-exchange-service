import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { oneHour } from 'src/helpers/helpers';
import { CachingService } from 'src/services/caching/cache.service';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { generateGetLogMessage } from 'src/utils/generate-log-message';
import { Logger } from 'winston';

@Injectable()
export class SimpleLockSetterService {
    constructor(
        private readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    private async setData(
        key: string,
        value: any,
        ttl: number,
    ): Promise<string> {
        const cacheKey = this.getSimpleLockCacheKey(key);
        try {
            await this.cachingService.setCache(cacheKey, value, ttl);
            return cacheKey;
        } catch (error) {
            const logMessage = generateGetLogMessage(
                SimpleLockSetterService.name,
                this.setData.name,
                cacheKey,
                error.message,
            );
            this.logger.error(logMessage);
            throw error;
        }
    }

    async setLockedTokenID(value: string): Promise<string> {
        return await this.setData('lockedTokenID', value, oneHour());
    }

    async getLpProxyTokenID(value: string): Promise<string> {
        return await this.setData('lpProxyTokenID', value, oneHour());
    }

    private getSimpleLockCacheKey(...args: any) {
        return generateCacheKeyFromParams('simpleLock', ...args);
    }
}
