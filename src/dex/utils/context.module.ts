import { Module } from '@nestjs/common';
import { ElrondCommunicationModule } from '../../services/elrond-communication/elrond-communication.module';
import { CacheManagerModule } from '../../services/cache-manager/cache-manager.module';
import { ContextService } from './context.service';

@Module({
    imports: [ElrondCommunicationModule, CacheManagerModule],
    providers: [ContextService],
    exports: [ContextService],
})
export class ContextModule {}
