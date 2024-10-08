import { Inject, Injectable } from '@nestjs/common';
import { PUB_SUB } from '../redis.pubSub.module';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PerformanceProfiler } from '@multiversx/sdk-nestjs-monitoring';
import { FeesCollectorAbiService } from 'src/modules/fees-collector/services/fees-collector.abi.service';
import { WeekTimekeepingAbiService } from 'src/submodules/week-timekeeping/services/week-timekeeping.abi.service';
import { constantsConfig, scAddress } from 'src/config';
import { FeesCollectorSetterService } from 'src/modules/fees-collector/services/fees-collector.setter.service';
import { WeeklyRewardsSplittingAbiService } from 'src/submodules/weekly-rewards-splitting/services/weekly-rewards-splitting.abi.service';
import { FeesCollectorComputeService } from 'src/modules/fees-collector/services/fees-collector.compute.service';
import { WeeklyRewardsSplittingSetterService } from 'src/submodules/weekly-rewards-splitting/services/weekly.rewarrds.splitting.setter.service';
import { Lock } from '@multiversx/sdk-nestjs-common';

@Injectable()
export class FeesCollectorCacheWarmerService {
    constructor(
        @Inject(PUB_SUB) private pubSub: RedisPubSub,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
        private readonly feesCollectorAbi: FeesCollectorAbiService,
        private readonly feesCollectorCompute: FeesCollectorComputeService,
        private readonly feesCollectorSetter: FeesCollectorSetterService,
        private readonly weekTimekeepingAbi: WeekTimekeepingAbiService,
        private readonly weeklyRewardsSplittingAbi: WeeklyRewardsSplittingAbiService,
        private readonly weeklyRewardsSplittingSetter: WeeklyRewardsSplittingSetterService,
    ) {}

    @Cron(CronExpression.EVERY_MINUTE)
    @Lock({ name: 'cacheFeesCollector', verbose: true })
    async cacheFeesCollector(): Promise<void> {
        this.logger.info('Start refresh fees collector data', {
            context: 'CacheFeesCollector',
        });

        const profiler = new PerformanceProfiler();

        const [allTokens, currentWeek] = await Promise.all([
            this.feesCollectorAbi.allTokens(),
            this.weekTimekeepingAbi.currentWeek(scAddress.feesCollector),
        ]);

        const accumulatedFeesUntilNow =
            await this.feesCollectorCompute.computeAccumulatedFeesUntilNow(
                scAddress.feesCollector,
                currentWeek,
            );

        const cachedKeys = await Promise.all([
            this.feesCollectorSetter.allTokens(allTokens),
            this.feesCollectorSetter.accumulatedFeesUntilNow(
                scAddress.feesCollector,
                currentWeek,
                accumulatedFeesUntilNow,
            ),
        ]);

        const tokensAccumulatedFeesCacheKeys =
            await this.cacheTokensAccumulatedFees(allTokens, currentWeek);

        const claimWeeksCacheKeys = await this.cacheClaimWeeksData(
            currentWeek,
            scAddress.feesCollector,
        );

        cachedKeys.push(...tokensAccumulatedFeesCacheKeys);
        cachedKeys.push(...claimWeeksCacheKeys);

        await this.deleteCacheKeys(cachedKeys);

        profiler.stop();
        this.logger.info(
            `Finish refresh fees collector data in ${profiler.duration}`,
            {
                context: 'CacheFeesCollector',
            },
        );
    }

    private async cacheTokensAccumulatedFees(
        allTokens: string[],
        week: number,
    ): Promise<string[]> {
        const cachedKeys = [];
        for (const token of allTokens) {
            const accumulatedFees =
                await this.feesCollectorAbi.getAccumulatedFeesRaw(week, token);

            const cacheKey = await this.feesCollectorSetter.accumulatedFees(
                week,
                token,
                accumulatedFees,
            );

            cachedKeys.push(cacheKey);
        }

        return cachedKeys;
    }

    private async cacheClaimWeeksData(
        currentWeek: number,
        feesCollectorScAddress: string,
    ): Promise<string[]> {
        const cachedKeys = [];
        const startWeek = currentWeek - constantsConfig.USER_MAX_CLAIM_WEEKS;

        for (let week = startWeek; week <= currentWeek; week++) {
            if (week < 1) {
                continue;
            }

            const totalEnergyForWeek =
                await this.weeklyRewardsSplittingAbi.totalEnergyForWeekRaw(
                    feesCollectorScAddress,
                    week,
                );
            const totalRewardsForWeek =
                await this.weeklyRewardsSplittingAbi.totalRewardsForWeekRaw(
                    feesCollectorScAddress,
                    week,
                );
            const totalLockedTokensForWeek =
                await this.weeklyRewardsSplittingAbi.totalLockedTokensForWeekRaw(
                    feesCollectorScAddress,
                    week,
                );

            const keys = await Promise.all([
                this.weeklyRewardsSplittingSetter.totalEnergyForWeek(
                    feesCollectorScAddress,
                    week,
                    totalEnergyForWeek,
                ),
                this.weeklyRewardsSplittingSetter.totalRewardsForWeek(
                    feesCollectorScAddress,
                    week,
                    totalRewardsForWeek,
                ),
                this.weeklyRewardsSplittingSetter.totalLockedTokensForWeek(
                    feesCollectorScAddress,
                    week,
                    totalLockedTokensForWeek,
                ),
            ]);

            cachedKeys.push(...keys);
        }

        return cachedKeys;
    }

    private async deleteCacheKeys(invalidatedKeys: string[]) {
        await this.pubSub.publish('deleteCacheKeys', invalidatedKeys);
    }
}
