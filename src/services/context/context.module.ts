import { Module } from '@nestjs/common';
import { ElrondCommunicationModule } from '../../services/elrond-communication/elrond-communication.module';
import { ContextService } from './context.service';
import { RedisCacheService } from '../redis-cache.service';
import { RouterModule } from '../../modules/router/router.module';

@Module({
    imports: [ElrondCommunicationModule, RouterModule],
    providers: [ContextService, RedisCacheService],
    exports: [ContextService],
})
export class ContextModule {}
