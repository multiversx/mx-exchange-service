import { Module } from '@nestjs/common';
import { TokenModule } from 'src/modules/tokens/token.module';
import { CachingModule } from 'src/services/caching/cache.module';
import { ContextModule } from 'src/services/context/context.module';
import { ElrondCommunicationModule } from 'src/services/elrond-communication/elrond-communication.module';
import { FarmAbiServiceV2 } from './services/farm.v2.abi.service';
import { FarmGetterServiceV2 } from './services/farm.v2.getter.service';
import { FarmResolverV2 } from './farm.v2.resolver';
import { FarmServiceV2 } from './services/farm.v2.service';
import { FarmComputeServiceV2 } from './services/farm.v2.compute.service';
import { FarmComputeService } from '../base-module/services/farm.compute.service';
import { FarmGetterService } from '../base-module/services/farm.getter.service';
import { PairModule } from 'src/modules/pair/pair.module';
import { FarmTransactionServiceV2 } from './services/farm.v2.transaction.service';
import { FarmSetterService } from '../base-module/services/farm.setter.service';
import { FarmSetterServiceV2 } from './services/farm.v2.setter.service';
import { WeekTimekeepingModule } from "../../../submodules/week-timekeeping/week-timekeeping.module";
import {
    WeeklyRewardsSplittingModule
} from "../../../submodules/weekly-rewards-splitting/weekly-rewards-splitting.module";
import { EnergyModule } from "../../energy/energy.module";

@Module({
    imports: [
        CachingModule,
        ContextModule,
        ElrondCommunicationModule,
        PairModule,
        TokenModule,
        EnergyModule,
        WeekTimekeepingModule.register(FarmAbiServiceV2),
        WeeklyRewardsSplittingModule.register(FarmAbiServiceV2, FarmComputeServiceV2)
    ],
    providers: [
        FarmServiceV2,
        FarmAbiServiceV2,
        {
            provide: FarmGetterService,
            useClass: FarmGetterServiceV2,
        },
        FarmGetterServiceV2,
        {
            provide: FarmSetterService,
            useClass: FarmSetterServiceV2,
        },
        FarmSetterServiceV2,
        {
            provide: FarmComputeService,
            useClass: FarmComputeServiceV2,
        },
        FarmComputeServiceV2,
        FarmTransactionServiceV2,
        FarmResolverV2,
    ],
    exports: [
        FarmServiceV2,
        FarmAbiServiceV2,
        FarmGetterServiceV2,
        FarmSetterServiceV2,
        FarmComputeServiceV2,
        FarmTransactionServiceV2,
    ],
})
export class FarmModuleV2 {}
