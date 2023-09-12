import { Module } from '@nestjs/common';
import { ContextModule } from 'src/services/context/context.module';
import { MXCommunicationModule } from 'src/services/multiversx-communication/mx.communication.module';
import { PairModule } from '../pair/pair.module';
import { TokenModule } from '../tokens/token.module';
import { WrappingModule } from '../wrapping/wrap.module';
import { LockedFarmTokenResolver } from './lockedFarmToken.resolver';
import { LockedLpTokenResolver } from './lockedLpToken.resolver';
import { SimpleLockAbiService } from './services/simple.lock.abi.service';
import { SimpleLockService } from './services/simple.lock.service';
import { SimpleLockSetterService } from './services/simple.lock.setter.service';
import { SimpleLockTransactionService } from './services/simple.lock.transactions.service';
import { SimpleLockResolver } from './simple.lock.resolver';
import { CommonAppModule } from 'src/common.app.module';
import { TransactionResolver } from './transaction.resolver';
import { FarmModule } from '../farm/farm.module';

@Module({
    imports: [
        CommonAppModule,
        MXCommunicationModule,
        ContextModule,
        PairModule,
        FarmModule,
        WrappingModule,
        TokenModule,
    ],
    providers: [
        SimpleLockService,
        SimpleLockAbiService,
        SimpleLockSetterService,
        SimpleLockTransactionService,
        SimpleLockResolver,
        LockedLpTokenResolver,
        LockedFarmTokenResolver,
        TransactionResolver,
    ],
    exports: [SimpleLockService, SimpleLockAbiService],
})
export class SimpleLockModule {}
