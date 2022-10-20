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

@Module({
    imports: [
        ElrondCommunicationModule,
        CachingModule,
        WeekTimekeepingModule.register(FeesCollectorAbiService),
        WeeklyRewardsSplittingModule.register(FeesCollectorAbiService),
    ],
    providers: [
        FeesCollectorService,
        FeesCollectorAbiService,
        FeesCollectorGetterService,
        FeesCollectorResolver,
        UserEntryFeesCollectorResolver,
    ],
    exports: [],
})
export class FeesCollectorModule {
}
