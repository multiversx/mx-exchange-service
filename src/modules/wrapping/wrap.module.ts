import { Module } from '@nestjs/common';
import { CachingModule } from '../../services/caching/cache.module';
import { MXCommunicationModule } from '../../services/multiversx-communication/mx.communication.module';
import { TokenModule } from '../tokens/token.module';
import { AbiWrapService } from './abi-wrap.service';
import { TransactionsWrapService } from './transactions-wrap.service';
import { WrapResolver } from './wrap.resolver';
import { WrapService } from './wrap.service';

@Module({
    imports: [MXCommunicationModule, CachingModule, TokenModule],
    providers: [
        WrapService,
        AbiWrapService,
        TransactionsWrapService,
        WrapResolver,
    ],
    exports: [WrapService, TransactionsWrapService],
})
export class WrappingModule {}
