import { forwardRef, Module } from '@nestjs/common';
import { FeesCollectorAbiService } from './services/fees-collector.abi.service';
import {
    FeesCollectorResolver,
    UserEntryFeesCollectorResolver,
} from './fees-collector.resolver';
import { MXCommunicationModule } from '../../services/multiversx-communication/mx.communication.module';
import { CachingModule } from '../../services/caching/cache.module';
import { FeesCollectorService } from './services/fees-collector.service';
import { WeeklyRewardsSplittingModule } from '../../submodules/weekly-rewards-splitting/weekly-rewards-splitting.module';
import { WeekTimekeepingModule } from '../../submodules/week-timekeeping/week-timekeeping.module';
import { FeesCollectorSetterService } from './services/fees-collector.setter.service';
import { FeesCollectorComputeService } from './services/fees-collector.compute.service';
import { ContextModule } from '../../services/context/context.module';

@Module({
    imports: [
        MXCommunicationModule,
        CachingModule,
        forwardRef(() => WeekTimekeepingModule),
        forwardRef(() => WeeklyRewardsSplittingModule),
        ContextModule,
    ],
    providers: [
        FeesCollectorService,
        FeesCollectorAbiService,
        FeesCollectorSetterService,
        FeesCollectorComputeService,
        FeesCollectorResolver,
        UserEntryFeesCollectorResolver,
    ],
    exports: [
        FeesCollectorAbiService,
        FeesCollectorSetterService,
        FeesCollectorService,
    ],
})
export class FeesCollectorModule {}
