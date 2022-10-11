import { Module } from '@nestjs/common';
import { CachingModule } from 'src/services/caching/cache.module';
import { ContextModule } from 'src/services/context/context.module';
import { ElrondCommunicationModule } from 'src/services/elrond-communication/elrond-communication.module';
import { PairModule } from '../pair/pair.module';
import { TokenModule } from '../tokens/token.module';
import { WrappingModule } from '../wrapping/wrap.module';
import { LockedFarmTokenResolver } from './lockedFarmToken.resolver';
import { LockedLpTokenResolver } from './lockedLpToken.resolver';
import { SimpleLockAbiService } from './services/simple.lock.abi.service';
import { SimpleLockGetterService } from './services/simple.lock.getter.service';
import { SimpleLockService } from './services/simple.lock.service';
import { SimpleLockSetterService } from './services/simple.lock.setter.service';
import { SimpleLockTransactionService } from './services/simple.lock.transactions.service';
import { SimpleLockResolver } from './simple.lock.resolver';
import { EnergyAbiService } from './services/energy/energy.abi.service';
import { EnergyGetterService } from './services/energy/energy.getter.service';
import { EnergySetterService } from './services/energy/energy.setter.service';
import { EnergyTransactionService } from './services/energy/energy.transaction.service';
import { EnergyResolver } from './energy.resolver';
import { CommonAppModule } from 'src/common.app.module';
import { TransactionResolver } from './transaction.resolver';
import { EnergyService } from './services/energy/energy.service';
import { EnergyComputeService } from './services/energy/energy.compute.service';
import { FarmBaseModule } from '../farm/base-module/farm.base.module';

@Module({
    imports: [
        CommonAppModule,
        ElrondCommunicationModule,
        ContextModule,
        CachingModule,
        PairModule,
        FarmBaseModule,
        WrappingModule,
        TokenModule,
    ],
    providers: [
        SimpleLockService,
        SimpleLockAbiService,
        SimpleLockGetterService,
        SimpleLockSetterService,
        SimpleLockTransactionService,
        SimpleLockResolver,
        LockedLpTokenResolver,
        LockedFarmTokenResolver,
        EnergyService,
        EnergyAbiService,
        EnergyGetterService,
        EnergySetterService,
        EnergyComputeService,
        EnergyTransactionService,
        EnergyResolver,
        TransactionResolver,
    ],
    exports: [
        SimpleLockService,
        SimpleLockGetterService,
        EnergyGetterService,
        EnergySetterService,
    ],
})
export class SimpleLockModule {}
