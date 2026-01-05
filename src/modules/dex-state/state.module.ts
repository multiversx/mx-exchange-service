import { Module } from '@nestjs/common';
import { DexStateClientModule } from 'src/microservices/dex-state/dex.state.client.module';
import { FarmsStateService } from './services/farms.state.service';
import { FeesCollectorStateService } from './services/fees.collector.state.service';
import { PairsStateService } from './services/pairs.state.service';
import { StakingFarmsStateService } from './services/staking.farms.state.service';
import { StateService } from './services/state.service';
import { TokensStateService } from './services/tokens.state.service';

@Module({
    imports: [DexStateClientModule],
    providers: [
        StateService,
        TokensStateService,
        PairsStateService,
        FarmsStateService,
        StakingFarmsStateService,
        FeesCollectorStateService,
    ],
    exports: [
        StateService,
        TokensStateService,
        PairsStateService,
        FarmsStateService,
        StakingFarmsStateService,
        FeesCollectorStateService,
    ],
})
export class StateModule {}
