import { Inject, Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { constantsConfig } from 'src/config';
import { AnalyticsComputeService } from 'src/modules/analytics/services/analytics.compute.service';
import { awsOneYear, delay } from '../../helpers/helpers';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { PUB_SUB } from '../redis.pubSub.module';
import { ApiConfigService } from 'src/helpers/api.config.service';
import { AnalyticsSetterService } from 'src/modules/analytics/services/analytics.setter.service';
import { Lock } from '@multiversx/sdk-nestjs-common';
import { TokenService } from 'src/modules/tokens/services/token.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { PerformanceProfiler } from '@multiversx/sdk-nestjs-monitoring';
import { AnalyticsTokenService } from 'src/modules/analytics/services/analytics.token.service';

@Injectable()
export class AnalyticsCacheWarmerService {
    constructor(
        private readonly analyticsCompute: AnalyticsComputeService,
        private readonly analyticsSetter: AnalyticsSetterService,
        private readonly apiConfig: ApiConfigService,
        private readonly tokenService: TokenService,
        private readonly analyticsTokenService: AnalyticsTokenService,
        @Inject(PUB_SUB) private pubSub: RedisPubSub,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
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
        delay(1000);
        const penaltyBurned = await this.analyticsCompute.computeTokenBurned(
            constantsConfig.MEX_TOKEN_ID,
            awsOneYear(),
            'penaltyBurned',
        );
        delay(1000);
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

    @Cron(CronExpression.EVERY_5_MINUTES)
    @Lock({ name: 'cacheTokensLast7dPrice', verbose: true })
    async cacheTokensLast7dPrice(): Promise<void> {
        const tokens = await this.tokenService.getUniqueTokenIDs(false);
        this.logger.info('Start refresh tokens last 7 days price');
        const profiler = new PerformanceProfiler();

        for (let i = 0; i < tokens.length; i += 10) {
            const batch = tokens.slice(i, i + 10);

            const tokensCandles =
                await this.analyticsTokenService.computeTokensLast7dPrice(
                    batch,
                );

            const promises = [];
            tokensCandles.forEach((elem) => {
                promises.push(
                    this.analyticsSetter.setTokenLast7dPrices(
                        elem.identifier,
                        elem.candles,
                    ),
                );
            });
            const cachedKeys = await Promise.all(promises);

            await this.deleteCacheKeys(cachedKeys);
        }

        profiler.stop();
        this.logger.info(
            `Finish refresh tokens last 7 days price in ${profiler.duration}`,
        );
    }

    private async deleteCacheKeys(invalidatedKeys: string[]) {
        await this.pubSub.publish('deleteCacheKeys', invalidatedKeys);
    }
}
