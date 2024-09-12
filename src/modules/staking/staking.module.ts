import { Module } from '@nestjs/common';
import { CommonAppModule } from 'src/common.app.module';
import { ContextModule } from 'src/services/context/context.module';
import { MXCommunicationModule } from 'src/services/multiversx-communication/mx.communication.module';
import { RemoteConfigModule } from '../remote-config/remote-config.module';
import { TokenModule } from '../tokens/token.module';
import { StakingAbiService } from './services/staking.abi.service';
import { StakingComputeService } from './services/staking.compute.service';
import { StakingService } from './services/staking.service';
import { StakingSetterService } from './services/staking.setter.service';
import { StakingTransactionService } from './services/staking.transactions.service';
import {
    StakingBoostedRewardsResolver,
    StakingResolver,
} from './staking.resolver';
import { WeekTimekeepingModule } from 'src/submodules/week-timekeeping/week-timekeeping.module';
import { WeeklyRewardsSplittingModule } from 'src/submodules/weekly-rewards-splitting/weekly-rewards-splitting.module';
import { StakingFilteringService } from './services/staking.filtering.service';

@Module({
    imports: [
        CommonAppModule,
        ContextModule,
        MXCommunicationModule,
        RemoteConfigModule,
        TokenModule,
        WeekTimekeepingModule,
        WeeklyRewardsSplittingModule,
    ],
    providers: [
        StakingAbiService,
        StakingService,
        StakingSetterService,
        StakingComputeService,
        StakingTransactionService,
        StakingFilteringService,
        StakingResolver,
        StakingBoostedRewardsResolver,
    ],
    exports: [
        StakingAbiService,
        StakingService,
        StakingSetterService,
        StakingComputeService,
        StakingFilteringService,
    ],
})
export class StakingModule {}
