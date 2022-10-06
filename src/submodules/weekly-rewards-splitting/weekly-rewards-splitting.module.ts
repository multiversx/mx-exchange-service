import { Module } from '@nestjs/common';
import { WeeklyRewardsSplittingAbiService } from "./services/weekly-rewards-splitting.abi.service";
import { WeeklyRewardsSplittingGetterService } from "./services/weekly-rewards.splitting.getter.service";
import { WeeklyRewardsSplittingComputeService } from "./services/weekly-rewards.splitting.compute.service";


@Module({
    imports: [
        // TODO: add imports
    ],
    exports: [
        WeeklyRewardsSplittingAbiService,
        WeeklyRewardsSplittingGetterService,
        WeeklyRewardsSplittingComputeService,
    ],
})
export class WeeklyRewardsSplittingModule {}
