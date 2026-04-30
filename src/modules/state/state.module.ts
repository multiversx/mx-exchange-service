import { Module } from '@nestjs/common';
import { FarmsStateService } from './services/farms.state.service';
import { FeesCollectorStateService } from './services/fees.collector.state.service';
import { PairsStateService } from './services/pairs.state.service';
import { StakingStateService } from './services/staking.state.service';
import { StateGrpcClientService } from './services/state.grpc.client.service';
import { StateService } from './services/state.service';
import { TokensStateService } from './services/tokens.state.service';
import { StateGrpcClientModule } from './state.grpc.client.module';

@Module({
    imports: [StateGrpcClientModule],
    providers: [
        StateService,
        TokensStateService,
        PairsStateService,
        FarmsStateService,
        StakingStateService,
        FeesCollectorStateService,
        StateGrpcClientService,
    ],
    exports: [
        StateService,
        TokensStateService,
        PairsStateService,
        FarmsStateService,
        StakingStateService,
        FeesCollectorStateService,
    ],
})
export class StateModule {}
