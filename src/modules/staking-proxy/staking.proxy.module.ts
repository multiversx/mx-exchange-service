import { Module, forwardRef } from '@nestjs/common';
import { CommonAppModule } from 'src/common.app.module';
import { ContextModule } from 'src/services/context/context.module';
import { MXCommunicationModule } from 'src/services/multiversx-communication/mx.communication.module';
import { FarmModule } from '../farm/farm.module';
import { PairModule } from '../pair/pair.module';
import { RemoteConfigModule } from '../remote-config/remote-config.module';
import { StakingModule } from '../staking/staking.module';
import { TokenModule } from '../tokens/token.module';
import { StakingProxyAbiService } from './services/staking.proxy.abi.service';
import { StakingProxyService } from './services/staking.proxy.service';
import { StakingProxySetterService } from './services/staking.proxy.setter.service';
import { StakingProxyTransactionService } from './services/staking.proxy.transactions.service';
import { StakingProxyResolver } from './staking.proxy.resolver';
import { FarmModuleV2 } from '../farm/v2/farm.v2.module';
import { StakingProxyFilteringService } from './services/staking.proxy.filtering.service';

@Module({
    imports: [
        CommonAppModule,
        ContextModule,
        MXCommunicationModule,
        forwardRef(() => PairModule),
        FarmModule,
        FarmModuleV2,
        StakingModule,
        TokenModule,
        RemoteConfigModule,
    ],
    providers: [
        StakingProxyAbiService,
        StakingProxyService,
        StakingProxySetterService,
        StakingProxyTransactionService,
        StakingProxyResolver,
        StakingProxyFilteringService,
    ],
    exports: [
        StakingProxyAbiService,
        StakingProxyService,
        StakingProxySetterService,
        StakingProxyFilteringService,
    ],
})
export class StakingProxyModule {}
