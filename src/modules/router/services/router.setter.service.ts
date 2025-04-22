import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Constants } from '@multiversx/sdk-nestjs-common';
import { CacheService } from 'src/services/caching/cache.service';
import { GenericSetterService } from 'src/services/generics/generic.setter.service';
import { Logger } from 'winston';
import { PairMetadata } from '../models/pair.metadata.model';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';

@Injectable()
export class RouterSetterService extends GenericSetterService {
    constructor(
        protected readonly cachingService: CacheService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
    ) {
        super(cachingService, logger);
        this.baseKey = 'router';
    }

    async setAllPairsAddress(value: string[]): Promise<string> {
        return await this.setData(
            this.getCacheKey('pairsAddress'),
            value,
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async setPairsMetadata(value: PairMetadata[]): Promise<string> {
        return await this.setData(
            this.getCacheKey('pairsMetadata'),
            value,
            CacheTtlInfo.ContractState.remoteTtl,
            CacheTtlInfo.ContractState.localTtl,
        );
    }

    async setAllPairTokens(value: string[]): Promise<string> {
        return await this.setData(
            this.getCacheKey('pairsTokens'),
            value,
            Constants.oneMinute(),
        );
    }

    async setTotalLockedValueUSD(value: string): Promise<string> {
        return await this.setData(
            this.getCacheKey('totalLockedValueUSD'),
            value,
            CacheTtlInfo.ContractInfo.remoteTtl,
            CacheTtlInfo.ContractInfo.localTtl,
        );
    }

    async setTotalFeesUSD(time: string, value: string): Promise<string> {
        return await this.setData(
            this.getCacheKey('totalFeesUSD', time),
            value,
            CacheTtlInfo.Analytics.remoteTtl,
            CacheTtlInfo.Analytics.localTtl,
        );
    }

    async setPairCount(value: number): Promise<string> {
        return await this.setData(
            this.getCacheKey('pairCount'),
            value,
            Constants.oneHour(),
        );
    }

    async setOwner(value: string): Promise<string> {
        return await this.setData(
            this.getCacheKey('owner'),
            value,
            Constants.oneHour(),
        );
    }

    async setCommonTokensForUserPairs(value: string[]): Promise<string> {
        return await this.setData(
            this.getCacheKey('commonTokensForUserPairs'),
            value,
            Constants.oneHour(),
        );
    }
}
