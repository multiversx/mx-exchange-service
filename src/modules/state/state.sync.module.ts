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
import { WeeklyRewardsSyncService } from './services/sync/weekly-rewards.sync.service';
import { TokensSyncService } from './services/sync/tokens.sync.service';
import { PairsSyncService } from './services/sync/pairs.sync.service';
import { FarmsSyncService } from './services/sync/farms.sync.service';
import { StakingSyncService } from './services/sync/staking.sync.service';
import { FeesCollectorSyncService } from './services/sync/fees-collector.sync.service';
import { AnalyticsSyncService } from './services/sync/analytics.sync.service';
import { StateSnapshotService } from './services/state.snapshot.service';

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
    providers: [
        StateSnapshotService,
        WeeklyRewardsSyncService,
        TokensSyncService,
        PairsSyncService,
        FarmsSyncService,
        StakingSyncService,
        FeesCollectorSyncService,
        AnalyticsSyncService,
        StateSyncService,
    ],
    exports: [StateSyncService],
})
export class StateSyncModule {}
