import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { oneMinute } from 'src/helpers/helpers';
import { TokenGetterService } from 'src/modules/tokens/services/token.getter.service';
import { CachingService } from 'src/services/caching/cache.service';
import { GenericGetterService } from 'src/services/generics/generic.getter.service';
import { Logger } from 'winston';
import { AnalyticsComputeService } from './analytics.compute.service';
import { PairComputeService } from 'src/modules/pair/services/pair.compute.service';

@Injectable()
export class AnalyticsGetterService extends GenericGetterService {
    constructor(
        protected readonly cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
        private readonly tokenGetter: TokenGetterService,
        @Inject(forwardRef(() => AnalyticsComputeService))
        private readonly analyticsCompute: AnalyticsComputeService,
        private readonly pairCompute: PairComputeService,
    ) {
        super(cachingService, logger);
        this.baseKey = 'analytics';
    }

    async getTokenPriceUSD(tokenID: string): Promise<string> {
        return await this.pairCompute.tokenPriceUSD(tokenID);
    }

    async getTotalTokenSupply(tokenID: string): Promise<string> {
        const cacheKey = this.getCacheKey(tokenID, 'totalTokenSupply');
        return await this.getData(
            cacheKey,
            async () =>
                (
                    await this.tokenGetter.getTokenMetadata(tokenID)
                ).supply,
            oneMinute(),
        );
    }

    async getTotalValueLockedUSD(): Promise<string> {
        const cacheKey = this.getCacheKey('totalValueLockedUSD');
        return await this.getData(
            cacheKey,
            () => this.analyticsCompute.computeTotalValueLockedUSD(),
            oneMinute() * 10,
            oneMinute() * 5,
        );
    }

    async getTotalLockedMexStakedUSD(): Promise<string> {
        const cacheKey = this.getCacheKey('totalLockedMexStakedUSD');
        return await this.getData(
            cacheKey,
            () => this.analyticsCompute.computeTotalLockedMexStakedUSD(),
            oneMinute() * 10,
            oneMinute() * 5,
        );
    }

    async getTotalValueStakedUSD(): Promise<string> {
        const cacheKey = this.getCacheKey('totalValueStakedUSD');
        return await this.getData(
            cacheKey,
            () => this.analyticsCompute.computeTotalValueStakedUSD(),
            oneMinute() * 10,
            oneMinute() * 5,
        );
    }

    async getLockedValueUSDFarms(): Promise<string> {
        const cacheKey = this.getCacheKey('lockedValueUSDFarms');
        return await this.getData(
            cacheKey,
            () => this.analyticsCompute.computeLockedValueUSDFarms(),
            oneMinute() * 10,
            oneMinute() * 5,
        );
    }

    async getTotalAggregatedRewards(days: number): Promise<string> {
        const cacheKey = this.getCacheKey(days, 'totalAggregatedRewards');
        return this.getData(
            cacheKey,
            () => this.analyticsCompute.computeTotalAggregatedRewards(days),
            oneMinute() * 10,
            oneMinute() * 5,
        );
    }

    async getFeeTokenBurned(tokenID: string, time: string): Promise<string> {
        const cacheKey = this.getCacheKey(tokenID, time, 'feeTokenBurned');
        return await this.getData(
            cacheKey,
            () =>
                this.analyticsCompute.computeTokenBurned(
                    tokenID,
                    time,
                    'feeBurned',
                ),
            oneMinute() * 30,
            oneMinute() * 10,
        );
    }

    async getPenaltyTokenBurned(
        tokenID: string,
        time: string,
    ): Promise<string> {
        const cacheKey = this.getCacheKey(tokenID, time, 'penaltyTokenBurned');
        return await this.getData(
            cacheKey,
            () =>
                this.analyticsCompute.computeTokenBurned(
                    tokenID,
                    time,
                    'penaltyBurned',
                ),
            oneMinute() * 30,
            oneMinute() * 10,
        );
    }
}
