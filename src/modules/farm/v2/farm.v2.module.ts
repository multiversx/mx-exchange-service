import { forwardRef, Module } from '@nestjs/common';
import { TokenModule } from 'src/modules/tokens/token.module';
import { ContextModule } from 'src/services/context/context.module';
import { MXCommunicationModule } from 'src/services/multiversx-communication/mx.communication.module';
import { FarmAbiServiceV2 } from './services/farm.v2.abi.service';
import { FarmResolverV2 } from './farm.v2.resolver';
import { FarmServiceV2 } from './services/farm.v2.service';
import { FarmComputeServiceV2 } from './services/farm.v2.compute.service';
import { PairModule } from 'src/modules/pair/pair.module';
import { FarmTransactionServiceV2 } from './services/farm.v2.transaction.service';
import { FarmSetterServiceV2 } from './services/farm.v2.setter.service';
import { WeekTimekeepingModule } from '../../../submodules/week-timekeeping/week-timekeeping.module';
import { WeeklyRewardsSplittingModule } from '../../../submodules/weekly-rewards-splitting/weekly-rewards-splitting.module';
import { EnergyModule } from '../../energy/energy.module';

@Module({
    imports: [
        ContextModule,
        MXCommunicationModule,
        forwardRef(() => PairModule),
        TokenModule,
        EnergyModule,
        forwardRef(() => WeekTimekeepingModule),
        forwardRef(() => WeeklyRewardsSplittingModule),
    ],
    providers: [
        FarmServiceV2,
        FarmAbiServiceV2,
        FarmSetterServiceV2,
        FarmComputeServiceV2,
        FarmTransactionServiceV2,
        FarmResolverV2,
    ],
    exports: [
        FarmServiceV2,
        FarmAbiServiceV2,
        FarmSetterServiceV2,
        FarmComputeServiceV2,
        FarmTransactionServiceV2,
    ],
})
export class FarmModuleV2 {}
