import { Module } from '@nestjs/common';
import { WeeklyRewardsSplittingResolver } from "./weekly-rewards-splitting.resolver";
import { WeeklyRewardsSplittingGetterService } from "./services/weekly-rewards.splitting.getter.service";
import { CachingModule } from "../../services/caching/cache.module";
import { WeeklyRewardsSplittingAbiService } from "./services/weekly-rewards-splitting.abi.service";
import { ElrondCommunicationModule } from "../../services/elrond-communication/elrond-communication.module";
import { WeeklyRewardsSplittingService } from "./services/weekly-rewards-splitting.service";

@Module({
    imports: [
        ElrondCommunicationModule,
        CachingModule
    ],
    providers: [
        WeeklyRewardsSplittingService,
        WeeklyRewardsSplittingAbiService,
        WeeklyRewardsSplittingGetterService,
        WeeklyRewardsSplittingResolver
    ],
    exports: [
        WeeklyRewardsSplittingService,
        WeeklyRewardsSplittingAbiService
    ]
})
export class WeeklyRewardsSplittingModule {}
