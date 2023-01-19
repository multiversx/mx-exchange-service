import { Module } from '@nestjs/common';
import { CommonAppModule } from 'src/common.app.module';
import { CachingModule } from 'src/services/caching/cache.module';
import { ContextModule } from 'src/services/context/context.module';
import { MXCommunicationModule } from 'src/services/multiversx-communication/mx.communication.module';
import { RemoteConfigModule } from '../remote-config/remote-config.module';
import { TokenModule } from '../tokens/token.module';
import { AbiStakingService } from './services/staking.abi.service';
import { StakingComputeService } from './services/staking.compute.service';
import { StakingGetterService } from './services/staking.getter.service';
import { StakingService } from './services/staking.service';
import { StakingSetterService } from './services/staking.setter.service';
import { StakingTransactionService } from './services/staking.transactions.service';
import { StakingResolver } from './staking.resolver';

@Module({
    imports: [
        CommonAppModule,
        ContextModule,
        CachingModule,
        MXCommunicationModule,
        RemoteConfigModule,
        TokenModule,
    ],
    providers: [
        AbiStakingService,
        StakingService,
        StakingGetterService,
        StakingSetterService,
        StakingComputeService,
        StakingTransactionService,
        StakingResolver,
    ],
    exports: [
        AbiStakingService,
        StakingService,
        StakingGetterService,
        StakingSetterService,
    ],
})
export class StakingModule {}
