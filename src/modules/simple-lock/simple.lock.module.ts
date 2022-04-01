import { Module } from '@nestjs/common';
import { CachingModule } from 'src/services/caching/cache.module';
import { ContextModule } from 'src/services/context/context.module';
import { ElrondCommunicationModule } from 'src/services/elrond-communication/elrond-communication.module';
import { SimpleLockAbiService } from './services/simple.lock.abi.service';
import { SimpleLockGetterService } from './services/simple.lock.getter.service';
import { SimpleLockService } from './services/simple.lock.service';
import { SimpleLockSetterService } from './services/simple.lock.setter.service';
import { SimpleLockResolver } from './simple.lock.resolver';

@Module({
    imports: [ElrondCommunicationModule, ContextModule, CachingModule],
    providers: [
        SimpleLockService,
        SimpleLockAbiService,
        SimpleLockGetterService,
        SimpleLockSetterService,
        SimpleLockResolver,
    ],
})
export class SimpleLockModule {}
