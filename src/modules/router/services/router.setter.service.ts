import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Constants } from '@multiversx/sdk-nestjs-common';
import { CacheService } from '@multiversx/sdk-nestjs-cache';
import { GenericSetterService } from 'src/services/generics/generic.setter.service';
import { Logger } from 'winston';
import { PairMetadata } from '../models/pair.metadata.model';

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
            Constants.oneMinute(),
        );
    }

    async setPairsMetadata(value: PairMetadata[]): Promise<string> {
        return await this.setData(
            this.getCacheKey('pairsMetadata'),
            value,
            Constants.oneMinute(),
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
            Constants.oneMinute(),
        );
    }

    async setTotalFeesUSD(time: string, value: string): Promise<string> {
        return await this.setData(
            this.getCacheKey('totalFeesUSD', time),
            value,
            Constants.oneMinute(),
        );
    }

    async setPairCount(value: number): Promise<string> {
        return await this.setData(
            this.getCacheKey('pairCount'),
            value,
            Constants.oneHour(),
        );
    }
}
