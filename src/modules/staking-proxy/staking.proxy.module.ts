import { Module } from '@nestjs/common';
import { CommonAppModule } from 'src/common.app.module';
import { CachingModule } from 'src/services/caching/cache.module';
import { ContextModule } from 'src/services/context/context.module';
import { ElrondCommunicationModule } from 'src/services/elrond-communication/elrond-communication.module';
import { PairModule } from '../pair/pair.module';
import { AbiStakingProxyService } from './services/staking.proxy.abi.service';
import { StakingProxyGetterService } from './services/staking.proxy.getter.service';
import { StakingProxyService } from './services/staking.proxy.service';
import { StakingProxySetterService } from './services/staking.proxy.setter.service';
import { StakingProxyTransactionService } from './services/staking.proxy.transactions.service';
import { StakingProxyResolver } from './staking.proxy.resolver';

@Module({
    imports: [
        CommonAppModule,
        ContextModule,
        CachingModule,
        ElrondCommunicationModule,
        PairModule,
    ],
    providers: [
        AbiStakingProxyService,
        StakingProxyService,
        StakingProxyGetterService,
        StakingProxySetterService,
        StakingProxyTransactionService,
        StakingProxyResolver,
    ],
    exports: [
        AbiStakingProxyService,
        StakingProxyGetterService,
        StakingProxySetterService,
    ],
})
export class StakingProxyModule {}
