import { Inject, Injectable } from '@nestjs/common';
import { PUB_SUB } from '../redis.pubSub.module';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { RemoteConfigGetterService } from 'src/modules/remote-config/remote-config.getter.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Lock } from '@multiversx/sdk-nestjs-common';
import { constantsConfig, scAddress } from 'src/config';
import { farmsAddresses } from 'src/utils/farm.utils';
import { FarmVersion } from 'src/modules/farm/models/farm.model';
import { PerformanceProfiler } from '@multiversx/sdk-nestjs-monitoring';
import { WeekTimekeepingAbiService } from 'src/submodules/week-timekeeping/services/week-timekeeping.abi.service';
import { WeeklyRewardsSplittingAbiService } from 'src/submodules/weekly-rewards-splitting/services/weekly-rewards-splitting.abi.service';
import { WeeklyRewardsSplittingSetterService } from 'src/submodules/weekly-rewards-splitting/services/weekly.rewarrds.splitting.setter.service';
import { WeeklyRewardsSplittingComputeService } from 'src/submodules/weekly-rewards-splitting/services/weekly-rewards-splitting.compute.service';

@Injectable()
export class WeeklyRewardsSplittingCacheWarmerService {
    constructor(
        @Inject(PUB_SUB) private pubSub: RedisPubSub,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
        private readonly remoteConfigGetterService: RemoteConfigGetterService,
        private readonly weekTimekeepingAbi: WeekTimekeepingAbiService,
        private readonly weeklyRewardsSplittingAbi: WeeklyRewardsSplittingAbiService,
        private readonly weeklyRewardsSplittingCompute: WeeklyRewardsSplittingComputeService,
        private readonly weeklyRewardsSplittingSetter: WeeklyRewardsSplittingSetterService,
    ) {}

    @Cron(CronExpression.EVERY_MINUTE)
    @Lock({ name: 'cacheWeeklyRewardsData', verbose: true })
    async cacheWeeklyRewardsData(): Promise<void> {
        this.logger.info(
            'Start refresh weekly rewards data for farms, staking and fees collector',
            {
                context: 'WeeklyRewardsSplittingCacheWarmer',
            },
        );

        const addresses = [
            scAddress.feesCollector,
            ...farmsAddresses([FarmVersion.V2]),
            ...(await this.remoteConfigGetterService.getStakingAddresses()),
        ];
        const profiler = new PerformanceProfiler();

        for (const address of addresses) {
            const currentWeek = await this.weekTimekeepingAbi.currentWeek(
                address,
            );

            await this.cacheClaimWeeksData(currentWeek, address);
        }

        profiler.stop();
        this.logger.info(
            `Finish refresh weekly rewards data in ${profiler.duration}`,
            {
                context: 'WeeklyRewardsSplittingCacheWarmer',
            },
        );
    }

    private async cacheClaimWeeksData(
        currentWeek: number,
        address: string,
    ): Promise<void> {
        const startWeek = currentWeek - constantsConfig.USER_MAX_CLAIM_WEEKS;

        for (let week = startWeek; week <= currentWeek; week++) {
            if (week < 1) {
                continue;
            }

            const totalEnergyForWeek =
                await this.weeklyRewardsSplittingAbi.totalEnergyForWeekRaw(
                    address,
                    week,
                );
            const totalRewardsForWeek =
                await this.weeklyRewardsSplittingAbi.totalRewardsForWeekRaw(
                    address,
                    week,
                );
            const totalLockedTokensForWeek =
                await this.weeklyRewardsSplittingAbi.totalLockedTokensForWeekRaw(
                    address,
                    week,
                );

            const abiKeys = await Promise.all([
                this.weeklyRewardsSplittingSetter.totalEnergyForWeek(
                    address,
                    week,
                    totalEnergyForWeek,
                ),
                this.weeklyRewardsSplittingSetter.totalRewardsForWeek(
                    address,
                    week,
                    totalRewardsForWeek,
                ),
                this.weeklyRewardsSplittingSetter.totalLockedTokensForWeek(
                    address,
                    week,
                    totalLockedTokensForWeek,
                ),
            ]);

            await this.deleteCacheKeys(abiKeys);

            const weekAPR =
                await this.weeklyRewardsSplittingCompute.computeWeekAPR(
                    address,
                    week,
                );

            const aprKey = await this.weeklyRewardsSplittingSetter.weekAPR(
                address,
                week,
                weekAPR,
            );

            await this.deleteCacheKeys([aprKey]);
        }
    }

    private async deleteCacheKeys(invalidatedKeys: string[]) {
        await this.pubSub.publish('deleteCacheKeys', invalidatedKeys);
    }
}
