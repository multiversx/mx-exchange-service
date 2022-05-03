import { Module } from '@nestjs/common';
import { CachingModule } from 'src/services/caching/cache.module';
import { ContextModule } from 'src/services/context/context.module';
import { ElrondCommunicationModule } from 'src/services/elrond-communication/elrond-communication.module';
import { FarmModule } from '../farm/farm.module';
import { PairModule } from '../pair/pair.module';
import { WrappingModule } from '../wrapping/wrap.module';
import { SimpleLockAbiService } from './services/simple.lock.abi.service';
import { SimpleLockGetterService } from './services/simple.lock.getter.service';
import { SimpleLockService } from './services/simple.lock.service';
import { SimpleLockSetterService } from './services/simple.lock.setter.service';
import { SimpleLockTransactionService } from './services/simple.lock.transactions.service';
import { SimpleLockResolver } from './simple.lock.resolver';

@Module({
    imports: [
        ElrondCommunicationModule,
        ContextModule,
        CachingModule,
        PairModule,
        FarmModule,
        WrappingModule,
    ],
    providers: [
        SimpleLockService,
        SimpleLockAbiService,
        SimpleLockGetterService,
        SimpleLockSetterService,
        SimpleLockTransactionService,
        SimpleLockResolver,
    ],
    exports: [SimpleLockService, SimpleLockGetterService],
})
export class SimpleLockModule {}
