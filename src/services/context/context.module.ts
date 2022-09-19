import { Module } from '@nestjs/common';
import { ElrondCommunicationModule } from '../elrond-communication/elrond-communication.module';
import { CachingModule } from '../caching/cache.module';
import { ContextGetterService } from './context.getter.service';
import { ContextSetterService } from './context.setter.service';

@Module({
    imports: [ElrondCommunicationModule, CachingModule],
    providers: [ContextGetterService, ContextSetterService],
    exports: [ContextGetterService, ContextSetterService],
})
export class ContextModule {}
