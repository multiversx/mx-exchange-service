import { Inject, Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { constantsConfig } from 'src/config';
import { AnalyticsComputeService } from 'src/modules/analytics/services/analytics.compute.service';
import { awsOneYear, delay } from '../../helpers/helpers';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { PUB_SUB } from '../redis.pubSub.module';
import { ApiConfigService } from 'src/helpers/api.config.service';
import { AnalyticsSetterService } from 'src/modules/analytics/services/analytics.setter.service';
import { RouterAbiService } from 'src/modules/router/services/router.abi.service';
import { Lock } from '@multiversx/sdk-nestjs-common';
import { AnalyticsPairService } from 'src/modules/analytics/services/analytics.pair.service';
import { AnalyticsPairSetterService } from 'src/modules/analytics/services/analytics.pair.setter.service';
import { alignTimestampTo4HourInterval } from 'src/utils/analytics.utils';
import { PriceCandlesResolutions } from 'src/modules/analytics/models/query.args';
import moment from 'moment';

@Injectable()
export class AnalyticsCacheWarmerService {
    constructor(
        private readonly analyticsCompute: AnalyticsComputeService,
        private readonly analyticsSetter: AnalyticsSetterService,
        private readonly apiConfig: ApiConfigService,
        private readonly routerAbi: RouterAbiService,
        private readonly analyticsPairService: AnalyticsPairService,
        private readonly analyticsPairSetter: AnalyticsPairSetterService,
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

    @Cron(CronExpression.EVERY_30_SECONDS)
    @Lock({ name: 'cacheTradingActivity', verbose: true })
    async cacheTradingActivity(): Promise<void> {
        const pairsMetadata = await this.routerAbi.pairsMetadata();
        const tokenIDs = new Set<string>();
        const cachedKeys = [];

        for (const pair of pairsMetadata) {
            const tradingActivity =
                await this.analyticsCompute.computePairTradingActivity(
                    pair.address,
                );
            const pairCachedKeys =
                await this.analyticsSetter.pairTradingActivity(
                    pair.address,
                    tradingActivity,
                );

            cachedKeys.push(pairCachedKeys);

            tokenIDs.add(pair.firstTokenID);
            tokenIDs.add(pair.secondTokenID);
        }

        for (const tokenID of tokenIDs.values()) {
            const tradingActivity =
                await this.analyticsCompute.computeTokenTradingActivity(
                    tokenID,
                );
            const tokenCachedKeys =
                await this.analyticsSetter.tokenTradingActivity(
                    tokenID,
                    tradingActivity,
                );

            cachedKeys.push(tokenCachedKeys);
        }

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

    @Cron(CronExpression.EVERY_2_HOURS)
    @Lock({ name: 'cachePriceCandles', verbose: true })
    async cachePriceCandles(): Promise<void> {
        const pairsMetadata = await this.routerAbi.pairsMetadata();
        const metrics = ['firstTokenPrice', 'secondTokenPrice'];
        const resolution = PriceCandlesResolutions.HOUR_4;

        const endTimestamp = moment().unix().toString();
        const startTimestamp = moment()
            .subtract(7, 'days')
            .unix()
            .toString();

        const alignedStart = alignTimestampTo4HourInterval(startTimestamp);
        const alignedEnd = alignTimestampTo4HourInterval(endTimestamp);

        for (const pair of pairsMetadata) {
            for (const metric of metrics) {
                const candles = await this.analyticsPairService.priceCandles(
                    pair.address,
                    metric,
                    alignedStart,
                    alignedEnd,
                    resolution,
                );

                const cacheKey = await this.analyticsPairSetter.setPriceCandles(
                    pair.address,
                    metric,
                    alignedStart,
                    alignedEnd,
                    resolution,
                    candles,
                );

                await this.deleteCacheKeys([cacheKey]);
            }
        }

        const tokenIDs = new Set<string>();
        for (const pair of pairsMetadata) {
            tokenIDs.add(pair.firstTokenID);
            tokenIDs.add(pair.secondTokenID);
        }

        for (const tokenID of tokenIDs) {
            const candles = await this.analyticsPairService.priceCandles(
                tokenID,
                'priceUSD',
                alignedStart,
                alignedEnd,
                resolution,
            );

            const cacheKey = await this.analyticsPairSetter.setPriceCandles(
                tokenID,
                'priceUSD',
                alignedStart,
                alignedEnd,
                resolution,
                candles,
            );

            await this.deleteCacheKeys([cacheKey]);
        }
    }

    private async deleteCacheKeys(invalidatedKeys: string[]) {
        await this.pubSub.publish('deleteCacheKeys', invalidatedKeys);
    }
}
