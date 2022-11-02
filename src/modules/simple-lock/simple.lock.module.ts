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
import { CommonAppModule } from 'src/common.app.module';
import { TransactionResolver } from './transaction.resolver';
import { FarmModuleV1_3 } from '../farm/v1.3/farm.v1.3.module';

@Module({
    imports: [
        CommonAppModule,
        ElrondCommunicationModule,
        ContextModule,
        CachingModule,
        PairModule,
        FarmModuleV1_3,
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
        TransactionResolver,
    ],
    exports: [SimpleLockService, SimpleLockGetterService],
})
export class SimpleLockModule {}
