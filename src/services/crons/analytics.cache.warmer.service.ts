import { Inject, Injectable, Logger } from '@nestjs/common';
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
import { GlobalRewardsService } from 'src/modules/analytics/services/global.rewards.service';
import { AnalyticsPairSetterService } from 'src/modules/analytics/services/analytics.pair.setter.service';
import { alignTimestampTo4HourInterval } from 'src/utils/analytics.utils';
import { AnalyticsQueryService } from '../analytics/services/analytics.query.service';
import moment from 'moment';

@Injectable()
export class AnalyticsCacheWarmerService {
    private readonly logger = new Logger(AnalyticsCacheWarmerService.name);

    constructor(
        private readonly analyticsCompute: AnalyticsComputeService,
        private readonly analyticsSetter: AnalyticsSetterService,
        private readonly apiConfig: ApiConfigService,
        private readonly routerAbi: RouterAbiService,
        private readonly globalRewardsService: GlobalRewardsService,
        private readonly analyticsPairSetter: AnalyticsPairSetterService,
        private readonly analyticsQueryService: AnalyticsQueryService,
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

    @Cron(CronExpression.EVERY_3_HOURS)
    @Lock({ name: 'cacheGlobalRewards', verbose: true })
    async cacheGlobalRewards(): Promise<void> {
        const weekOffsets = [0, 1, 2, 3, 4];

        const allData = await Promise.all(
            weekOffsets.map(async (weekOffset) => {
                const feesRewards =
                    await this.globalRewardsService.computeFeesCollectorRewards(
                        weekOffset,
                    );
                const farmsRewards =
                    await this.globalRewardsService.computeFarmsRewards(weekOffset);
                const stakingRewards =
                    await this.globalRewardsService.computeStakingRewards(weekOffset);

                return {
                    weekOffset,
                    feesRewards,
                    farmsRewards,
                    stakingRewards,
                };
            }),
        );

        const allCacheKeysPromises = allData.map(async (data) => {
            const cacheKeys = await Promise.all([
                this.analyticsSetter.feesCollectorRewards(
                    data.weekOffset,
                    data.feesRewards,
                ),
                this.analyticsSetter.farmRewards(
                    data.weekOffset,
                    data.farmsRewards,
                ),
                this.analyticsSetter.stakingRewards(
                    data.weekOffset,
                    data.stakingRewards,
                ),
            ]);

            return cacheKeys;
        });

        const allCacheKeys = (await Promise.all(allCacheKeysPromises)).flat();
        await this.deleteCacheKeys(allCacheKeys);
    }

    @Cron(CronExpression.EVERY_2_HOURS)
    @Lock({ name: 'cacheTokenMiniChartPriceCandles', verbose: true })
    async cacheTokenMiniChartPriceCandles(): Promise<void> {
        const pairsMetadata = await this.routerAbi.pairsMetadata();

        const endTimestamp = moment().unix().toString();
        const startTimestamp = moment().subtract(7, 'days').unix().toString();

        const alignedStart = alignTimestampTo4HourInterval(startTimestamp);
        const alignedEnd = alignTimestampTo4HourInterval(endTimestamp);

        const tokenIDs = new Set<string>();
        for (const pair of pairsMetadata) {
            tokenIDs.add(pair.firstTokenID);
            tokenIDs.add(pair.secondTokenID);
        }

        for (const tokenID of tokenIDs) {
            const candles = await this.analyticsQueryService.getTokenMiniChartPriceCandles({
                series: tokenID,
                start: alignedStart,
                end: alignedEnd,
            });

            const cacheKey = await this.analyticsPairSetter.setTokenMiniChartPriceCandles(
                tokenID,
                alignedStart,
                alignedEnd,
                candles,
            );

            await this.deleteCacheKeys([cacheKey]);
        }
    }

    private async deleteCacheKeys(invalidatedKeys: string[]) {
        await this.pubSub.publish('deleteCacheKeys', invalidatedKeys);
    }
}
