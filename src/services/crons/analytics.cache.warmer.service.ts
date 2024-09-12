import { Inject, Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { constantsConfig } from 'src/config';
import { AnalyticsComputeService } from 'src/modules/analytics/services/analytics.compute.service';
import { awsOneYear, delay } from '../../helpers/helpers';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { PUB_SUB } from '../redis.pubSub.module';
import { ApiConfigService } from 'src/helpers/api.config.service';
import { AnalyticsSetterService } from 'src/modules/analytics/services/analytics.setter.service';

@Injectable()
export class AnalyticsCacheWarmerService {
    constructor(
        private readonly analyticsCompute: AnalyticsComputeService,
        private readonly analyticsSetter: AnalyticsSetterService,
        private readonly apiConfig: ApiConfigService,
        @Inject(PUB_SUB) private pubSub: RedisPubSub,
    ) {}

    @Cron(CronExpression.EVERY_MINUTE)
    async cacheAnalytics(): Promise<void> {
        const [
            totalValueLockedUSD,
            totalAggregatedRewards,
            totalValueLockedUSDFarms,
        ] = await Promise.all([
            this.analyticsCompute.computeTotalValueLockedUSD(),
            this.analyticsCompute.computeTotalAggregatedRewards(30),
            this.analyticsCompute.computeLockedValueUSDFarms(),
        ]);
        const cachedKeys = await Promise.all([
            this.analyticsSetter.totalValueLockedUSD(totalValueLockedUSD),
            this.analyticsSetter.totalAggregatedRewards(
                30,
                totalAggregatedRewards,
            ),
            this.analyticsSetter.lockedValueUSDFarms(totalValueLockedUSDFarms),
        ]);

        await this.deleteCacheKeys(cachedKeys);
    }

    @Cron(CronExpression.EVERY_5_MINUTES)
    async cacheBurnedTokens(): Promise<void> {
        if (!this.apiConfig.isAWSTimestreamRead()) {
            return;
        }

        const feeBurned = await this.analyticsCompute.computeTokenBurned(
            constantsConfig.MEX_TOKEN_ID,
            awsOneYear(),
            'feeBurned',
        );
        delay(constantsConfig.AWS_QUERY_CACHE_WARMER_DELAY);
        const penaltyBurned = await this.analyticsCompute.computeTokenBurned(
            constantsConfig.MEX_TOKEN_ID,
            awsOneYear(),
            'penaltyBurned',
        );
        delay(constantsConfig.AWS_QUERY_CACHE_WARMER_DELAY);
        const cachedKeys = await Promise.all([
            this.analyticsSetter.feeTokenBurned(
                constantsConfig.MEX_TOKEN_ID,
                awsOneYear(),
                feeBurned,
            ),
            this.analyticsSetter.penaltyTokenBurned(
                constantsConfig.MEX_TOKEN_ID,
                awsOneYear(),
                penaltyBurned,
            ),
        ]);
        await this.deleteCacheKeys(cachedKeys);
    }

    private async deleteCacheKeys(invalidatedKeys: string[]) {
        await this.pubSub.publish('deleteCacheKeys', invalidatedKeys);
    }
}
