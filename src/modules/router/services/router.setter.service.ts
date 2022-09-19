import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { oneHour, oneMinute } from 'src/helpers/helpers';
import { CachingService } from 'src/services/caching/cache.service';
import { GenericSetterService } from 'src/services/generics/generic.setter.service';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { Logger } from 'winston';
import { PairMetadata } from '../models/pair.metadata.model';

@Injectable()
export class RouterSetterService extends GenericSetterService {
    constructor(
        protected readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
    ) {
        super(cachingService, logger);
    }

    async setAllPairsAddress(value: string[]): Promise<string> {
        return await this.setData(
            this.getRouterCacheKey('pairsAddress'),
            value,
            oneMinute(),
        );
    }

    async setPairsMetadata(value: PairMetadata[]): Promise<string> {
        return await this.setData(
            this.getRouterCacheKey('pairsMetadata'),
            value,
            oneMinute(),
        );
    }

    async setAllPairTokens(value: string[]): Promise<string> {
        const cacheKey = this.getRouterCacheKey('pairsTokens');
        await this.cachingService.setCache(cacheKey, value, oneMinute());
        return cacheKey;
    }

    async setAllPairsManagedAddresses(value: string[]): Promise<string> {
        const cacheKey = this.getRouterCacheKey('pairsManagedAddresses');
        await this.cachingService.setCache(cacheKey, value, oneMinute());
        return cacheKey;
    }

    async setTotalLockedValueUSD(value: string): Promise<string> {
        return await this.setData(
            this.getRouterCacheKey('totalLockedValueUSD'),
            value,
            oneMinute(),
        );
    }

    async setTotalVolumeUSD(value: string, time: string): Promise<string> {
        return await this.setData(
            this.getRouterCacheKey(`totalVolumeUSD.${time}`),
            value,
            oneMinute(),
        );
    }

    async setTotalFeesUSD(value: string, time: string): Promise<string> {
        return await this.setData(
            this.getRouterCacheKey(`totalFeesUSD.${time}`),
            value,
            oneMinute(),
        );
    }

    async setPairCount(value: number): Promise<string> {
        return await this.setData(
            this.getRouterCacheKey('pairCount'),
            value,
            oneHour(),
        );
    }

    private getRouterCacheKey(...args: any) {
        return generateCacheKeyFromParams('router', ...args);
    }
}
