import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { oneMinute } from 'src/helpers/helpers';
import { CachingService } from 'src/services/caching/cache.service';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { Logger } from 'winston';

@Injectable()
export class RouterSetterService {
    constructor(
        private readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async setTotalLockedValueUSD(value: string): Promise<string> {
        const cacheKey = this.getRouterCacheKey('totalLockedValueUSD');
        await this.cachingService.setCache(cacheKey, value, oneMinute());
        return cacheKey;
    }

    async setTotalVolumeUSD(value: string, time: string): Promise<string> {
        const cacheKey = this.getRouterCacheKey(`totalVolumeUSD.${time}`);
        await this.cachingService.setCache(cacheKey, value, oneMinute());
        return cacheKey;
    }

    async setTotalFeesUSD(value: string, time: string): Promise<string> {
        const cacheKey = this.getRouterCacheKey(`totalFeesUSD.${time}`);
        await this.cachingService.setCache(cacheKey, value, oneMinute());
        return cacheKey;
    }

    private getRouterCacheKey(...args: any) {
        return generateCacheKeyFromParams('router', ...args);
    }
}
