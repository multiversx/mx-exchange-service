import { Module } from '@nestjs/common';
import { FeesCollectorGetterService } from "./services/fees-collector.getter.service";
import { FeesCollectorAbiService } from "./services/fees-collector.abi.service";
import { FeesCollectorResolver } from "./fees-collector.resolver";
import { ElrondCommunicationModule } from "../../services/elrond-communication/elrond-communication.module";
import { CachingModule } from "../../services/caching/cache.module";
import {
    WeeklyRewardsSplittingModule
} from "../../submodules/weekly-rewards-splitting/weekly-rewards-splitting.module";
import { FeesCollectorService } from "./services/fees-collector.service";
import { WeekTimekeepingModule } from "../../submodules/week-timekeeping/week-timekeeping.module";

@Module({
    imports: [
        ElrondCommunicationModule,
        CachingModule,
        WeekTimekeepingModule,
        WeeklyRewardsSplittingModule
    ],
    providers: [
        FeesCollectorService,
        FeesCollectorAbiService,
        FeesCollectorGetterService,
        FeesCollectorResolver
    ],
    exports: [],
})
export class FeesCollectorModule {}
