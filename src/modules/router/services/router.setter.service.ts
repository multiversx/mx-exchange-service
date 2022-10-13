import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { oneHour, oneMinute } from 'src/helpers/helpers';
import { CachingService } from 'src/services/caching/cache.service';
import { GenericSetterService } from 'src/services/generics/generic.setter.service';
import { Logger } from 'winston';
import { PairMetadata } from '../models/pair.metadata.model';

@Injectable()
export class RouterSetterService extends GenericSetterService {
    constructor(
        protected readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
    ) {
        super(cachingService, logger);
        this.baseKey = 'router';
    }

    async setAllPairsAddress(value: string[]): Promise<string> {
        return await this.setData(
            this.getCacheKey('pairsAddress'),
            value,
            oneMinute(),
        );
    }

    async setPairsMetadata(value: PairMetadata[]): Promise<string> {
        return await this.setData(
            this.getCacheKey('pairsMetadata'),
            value,
            oneMinute(),
        );
    }

    async setAllPairTokens(value: string[]): Promise<string> {
        const cacheKey = this.getCacheKey('pairsTokens');
        await this.cachingService.setCache(cacheKey, value, oneMinute());
        return cacheKey;
    }

    async setAllPairsManagedAddresses(value: string[]): Promise<string> {
        const cacheKey = this.getCacheKey('pairsManagedAddresses');
        await this.cachingService.setCache(cacheKey, value, oneMinute());
        return cacheKey;
    }

    async setTotalLockedValueUSD(value: string): Promise<string> {
        return await this.setData(
            this.getCacheKey('totalLockedValueUSD'),
            value,
            oneMinute(),
        );
    }

    async setTotalVolumeUSD(value: string, time: string): Promise<string> {
        return await this.setData(
            this.getCacheKey(`totalVolumeUSD.${time}`),
            value,
            oneMinute(),
        );
    }

    async setTotalFeesUSD(value: string, time: string): Promise<string> {
        return await this.setData(
            this.getCacheKey(`totalFeesUSD.${time}`),
            value,
            oneMinute(),
        );
    }

    async setPairCount(value: number): Promise<string> {
        return await this.setData(
            this.getCacheKey('pairCount'),
            value,
            oneHour(),
        );
    }
}
