import { Injectable } from '@nestjs/common';
import { constantsConfig } from 'src/config';
import { WeekTimekeepingModel } from 'src/submodules/week-timekeeping/models/week-timekeeping.model';
import { WeekTimekeepingAbiService } from 'src/submodules/week-timekeeping/services/week-timekeeping.abi.service';
import { GlobalInfoByWeekModel } from 'src/submodules/weekly-rewards-splitting/models/weekly-rewards-splitting.model';
import { WeeklyRewardsSplittingAbiService } from 'src/submodules/weekly-rewards-splitting/services/weekly-rewards-splitting.abi.service';

@Injectable()
export class WeeklyRewardsSyncService {
    constructor(
        private readonly weeklyRewardsSplittingAbi: WeeklyRewardsSplittingAbiService,
        private readonly weekTimekeepingAbi: WeekTimekeepingAbiService,
    ) {}

    async getGlobalInfoWeeklyModels(
        address: string,
        currentWeek: number,
    ): Promise<GlobalInfoByWeekModel[]> {
        const result: GlobalInfoByWeekModel[] = [];
        for (
            let week = currentWeek - constantsConfig.USER_MAX_CLAIM_WEEKS;
            week <= currentWeek;
            week++
        ) {
            if (week < 1) {
                continue;
            }

            const [
                totalRewardsForWeek,
                totalEnergyForWeek,
                totalLockedTokensForWeek,
            ] = await Promise.all([
                this.weeklyRewardsSplittingAbi.totalRewardsForWeekRaw(
                    address,
                    week,
                ),
                this.weeklyRewardsSplittingAbi.totalEnergyForWeekRaw(
                    address,
                    week,
                ),
                this.weeklyRewardsSplittingAbi.totalLockedTokensForWeekRaw(
                    address,
                    week,
                ),
            ]);

            result.push(
                new GlobalInfoByWeekModel({
                    week,
                    totalRewardsForWeek,
                    totalEnergyForWeek,
                    totalLockedTokensForWeek,
                }),
            );
        }

        return result;
    }

    async getWeekTimekeeping(address: string): Promise<WeekTimekeepingModel> {
        const [currentWeek, firstWeekStartEpoch] = await Promise.all([
            this.weekTimekeepingAbi.getCurrentWeekRaw(address),
            this.weekTimekeepingAbi.firstWeekStartEpochRaw(address),
        ]);

        const startEpochForWeek =
            firstWeekStartEpoch +
            (currentWeek - 1) * constantsConfig.EPOCHS_IN_WEEK;
        const endEpochForWeek =
            startEpochForWeek + constantsConfig.EPOCHS_IN_WEEK - 1;

        return new WeekTimekeepingModel({
            currentWeek,
            firstWeekStartEpoch,
            startEpochForWeek,
            endEpochForWeek,
        });
    }

    async getLastGlobalUpdateWeek(address: string): Promise<number> {
        return this.weeklyRewardsSplittingAbi.lastGlobalUpdateWeekRaw(address);
    }
}
