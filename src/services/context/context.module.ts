import { Module } from '@nestjs/common';
import { MXCommunicationModule } from '../multiversx-communication/mx.communication.module';
import { CachingModule } from '../caching/cache.module';
import { ContextGetterService } from './context.getter.service';
import { ContextSetterService } from './context.setter.service';

@Module({
    imports: [MXCommunicationModule, CachingModule],
    providers: [ContextGetterService, ContextSetterService],
    exports: [ContextGetterService, ContextSetterService],
})
export class ContextModule {}
