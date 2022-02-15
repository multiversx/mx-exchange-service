import { Module } from '@nestjs/common';
import { CommonAppModule } from 'src/common.app.module';
import { CachingModule } from 'src/services/caching/cache.module';
import { ContextModule } from 'src/services/context/context.module';
import { ElrondCommunicationModule } from 'src/services/elrond-communication/elrond-communication.module';
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
        ElrondCommunicationModule,
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
    exports: [AbiStakingService, StakingGetterService, StakingSetterService],
})
export class StakingModule {}
