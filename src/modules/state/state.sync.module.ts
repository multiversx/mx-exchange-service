import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AnalyticsModule } from 'src/services/analytics/analytics.module';
import { ContextModule } from 'src/services/context/context.module';
import { MXCommunicationModule } from 'src/services/multiversx-communication/mx.communication.module';
import { WeekTimekeepingModule } from 'src/submodules/week-timekeeping/week-timekeeping.module';
import { WeeklyRewardsSplittingModule } from 'src/submodules/weekly-rewards-splitting/weekly-rewards-splitting.module';
import { EnergyModule } from '../energy/energy.module';
import { FarmModuleV2 } from '../farm/v2/farm.v2.module';
import { FeesCollectorModule } from '../fees-collector/fees-collector.module';
import { PairModule } from '../pair/pair.module';
import { RemoteConfigModule } from '../remote-config/remote-config.module';
import { RouterModule } from '../router/router.module';
import { StakingProxyModule } from '../staking-proxy/staking.proxy.module';
import { StakingModule } from '../staking/staking.module';
import { TokenModule } from '../tokens/token.module';
import {
    StateSnapshot,
    StateSnapshotSchema,
} from './entities/state.snapshot.schema';
import { StateSyncService } from './services/state.sync.service';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: StateSnapshot.name, schema: StateSnapshotSchema },
        ]),
        RouterModule,
        PairModule,
        TokenModule,
        FarmModuleV2,
        WeekTimekeepingModule,
        WeeklyRewardsSplittingModule,
        StakingModule,
        RemoteConfigModule,
        FeesCollectorModule,
        EnergyModule,
        StakingProxyModule,
        MXCommunicationModule,
        AnalyticsModule,
        ContextModule,
    ],
    providers: [StateSyncService],
    exports: [StateSyncService],
})
export class StateSyncModule {}
