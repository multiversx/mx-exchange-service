import { Module } from '@nestjs/common';
import { DexStateController } from './dex.state.controller';
import { DexStateService } from './services/dex.state.service';
import { StateStore } from './services/state.store';
import { BulkUpdatesService } from './services/bulk.updates.service';
import { FarmComputeService } from './services/compute/farm.compute.service';
import { StakingComputeService } from './services/compute/staking.compute.service';
import { TokensStateHandler } from './services/handlers/tokens.state.handler';
import { PairsStateHandler } from './services/handlers/pairs.state.handler';
import { FarmsStateHandler } from './services/handlers/farms.state.handler';
import { StakingStateHandler } from './services/handlers/staking.state.handler';
import { FeesCollectorStateHandler } from './services/handlers/fees-collector.state.handler';
import { TimekeepingStateHandler } from './services/handlers/timekeeping.state.handler';
import { StateInitializationService } from './services/state.initialization.service';
import { DynamicModuleUtils } from 'src/utils/dynamic.module.utils';

@Module({
    imports: [DynamicModuleUtils.getCacheModule()],
    providers: [
        StateStore,
        FarmComputeService,
        StakingComputeService,
        BulkUpdatesService,
        // Handlers
        TokensStateHandler,
        PairsStateHandler,
        FarmsStateHandler,
        StakingStateHandler,
        FeesCollectorStateHandler,
        TimekeepingStateHandler,
        // Initialization
        StateInitializationService,
        // Facade
        DexStateService,
    ],
    controllers: [DexStateController],
})
export class DexStateAppModule {}
