import { Module } from '@nestjs/common';
import { ContextModule } from '../../services/context/context.module';
import { ElrondCommunicationModule } from '../../services/elrond-communication/elrond-communication.module';
import { AbiWrapService } from './abi-wrap.service';
import { TransactionsWrapService } from './transactions-wrap.service';
import { WrapResolver } from './wrap.resolver';
import { WrapService } from './wrap.service';
import { RedisCacheService } from '../../services/redis-cache.service';

@Module({
    imports: [ElrondCommunicationModule, ContextModule],
    providers: [
        WrapService,
        AbiWrapService,
        TransactionsWrapService,
        RedisCacheService,
        WrapResolver,
    ],
    exports: [WrapService, TransactionsWrapService],
})
export class WrappingModule {}
