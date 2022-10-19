import { Module } from '@nestjs/common';
import { FeesCollectorGetterService } from './services/fees-collector.getter.service';
import { FeesCollectorAbiService } from './services/fees-collector.abi.service';
import { FeesCollectorResolver, UserEntryFeesCollectorResolver } from './fees-collector.resolver';
import { ElrondCommunicationModule } from '../../services/elrond-communication/elrond-communication.module';
import { CachingModule } from '../../services/caching/cache.module';
import { FeesCollectorService } from './services/fees-collector.service';
import {
    WeeklyRewardsSplittingModule,
} from '../../submodules/weekly-rewards-splitting/weekly-rewards-splitting.module';
import { WeekTimekeepingModule } from '../../submodules/week-timekeeping/week-timekeeping.module';
import { FeesCollectorComputeService } from "./services/fees-collector.compute.service";
import { RouterModule } from "../router/router.module";
import { PairModule } from "../pair/pair.module";

@Module({
    imports: [
        ElrondCommunicationModule,
        CachingModule,
        WeekTimekeepingModule.register(FeesCollectorAbiService),
        WeeklyRewardsSplittingModule.register(FeesCollectorAbiService),
        RouterModule,
        PairModule,
    ],
    providers: [
        FeesCollectorService,
        FeesCollectorAbiService,
        FeesCollectorGetterService,
        FeesCollectorComputeService,
        FeesCollectorResolver,
        UserEntryFeesCollectorResolver,
    ],
    exports: [],
})
export class FeesCollectorModule {
}
