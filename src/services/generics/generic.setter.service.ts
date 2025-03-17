import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { generateSetLogMessage } from 'src/utils/generate-log-message';
import { Logger } from 'winston';
import { CacheService } from 'src/services/caching/cache.service';
import { generateCacheKeyFromParams } from '../../utils/generate-cache-key';
import { CacheTtlInfo } from '../caching/cache.ttl.info';
import {
    formatNullOrUndefined,
    parseCachedNullOrUndefined,
} from 'src/utils/cache.utils';

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
        if (typeof value === 'undefined' || value === null) {
            remoteTtl = CacheTtlInfo.NullValue.remoteTtl;
            localTtl = CacheTtlInfo.NullValue.localTtl;
        }

        await this.cachingService.set(
            cacheKey,
            formatNullOrUndefined(value),
            remoteTtl,
            localTtl,
        );
        return cacheKey;
    }

    protected async setDataOrUpdateTtl(
        cacheKey: string,
        value: any,
        remoteTtl: number,
        localTtl?: number,
    ): Promise<string> {
        const cachedValue = await this.cachingService.getRemote(cacheKey);

        if (
            cachedValue !== undefined &&
            parseCachedNullOrUndefined(cachedValue) === value
        ) {
            if (typeof value === 'undefined' || value === null) {
                remoteTtl = CacheTtlInfo.NullValue.remoteTtl;
            }
            await this.cachingService.setTtlRemote(cacheKey, remoteTtl);

            return undefined;
        }

        return this.setData(cacheKey, value, remoteTtl, localTtl);
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
