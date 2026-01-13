import { Injectable } from '@nestjs/common';
import { constantsConfig } from 'src/config';
import { GlobalInfoByWeekModel } from 'src/submodules/weekly-rewards-splitting/models/weekly-rewards-splitting.model';
import { WeeklyRewardsSplittingAbiService } from 'src/submodules/weekly-rewards-splitting/services/weekly-rewards-splitting.abi.service';

@Injectable()
export class WeeklyRewardsSyncService {
    constructor(
        private readonly weeklyRewardsSplittingAbi: WeeklyRewardsSplittingAbiService,
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
}
