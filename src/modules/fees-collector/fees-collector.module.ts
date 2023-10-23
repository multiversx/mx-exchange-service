import { forwardRef, Module } from '@nestjs/common';
import { FeesCollectorAbiService } from './services/fees-collector.abi.service';
import {
    FeesCollectorResolver,
    UserEntryFeesCollectorResolver,
} from './fees-collector.resolver';
import { MXCommunicationModule } from '../../services/multiversx-communication/mx.communication.module';
import { FeesCollectorService } from './services/fees-collector.service';
import { WeeklyRewardsSplittingModule } from '../../submodules/weekly-rewards-splitting/weekly-rewards-splitting.module';
import { WeekTimekeepingModule } from '../../submodules/week-timekeeping/week-timekeeping.module';
import { FeesCollectorSetterService } from './services/fees-collector.setter.service';
import { FeesCollectorComputeService } from './services/fees-collector.compute.service';
import { ContextModule } from '../../services/context/context.module';
import { FeesCollectorTransactionService } from './services/fees-collector.transaction.service';
import { EnergyModule } from '../energy/energy.module';
import { TokenModule } from '../tokens/token.module';

@Module({
    imports: [
        MXCommunicationModule,
        forwardRef(() => WeekTimekeepingModule),
        forwardRef(() => WeeklyRewardsSplittingModule),
        ContextModule,
        EnergyModule,
        TokenModule,
    ],
    providers: [
        FeesCollectorService,
        FeesCollectorAbiService,
        FeesCollectorSetterService,
        FeesCollectorComputeService,
        FeesCollectorTransactionService,
        FeesCollectorResolver,
        UserEntryFeesCollectorResolver,
    ],
    exports: [
        FeesCollectorAbiService,
        FeesCollectorSetterService,
        FeesCollectorService,
        FeesCollectorComputeService,
    ],
})
export class FeesCollectorModule {}
