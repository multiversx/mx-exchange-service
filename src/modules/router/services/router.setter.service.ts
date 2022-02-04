import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { oneMinute } from 'src/helpers/helpers';
import { CachingService } from 'src/services/caching/cache.service';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { Logger } from 'winston';
import { PairMetadata } from '../models/pair.metadata.model';

@Injectable()
export class RouterSetterService {
    constructor(
        private readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async setAllPairsAddress(value: string[]): Promise<string> {
        const cacheKey = this.getRouterCacheKey('pairsAddress');
        await this.cachingService.setCache(cacheKey, value, oneMinute());
        return cacheKey;
    }

    async setPairsMetadata(value: PairMetadata[]): Promise<string> {
        const cacheKey = this.getRouterCacheKey('pairsMetadata');
        await this.cachingService.setCache(cacheKey, value, oneMinute());
        return cacheKey;
    }

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
