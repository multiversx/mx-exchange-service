import { Module } from '@nestjs/common';
import { CachingModule } from '../../services/caching/cache.module';
import { MXCommunicationModule } from '../../services/multiversx-communication/mx.communication.module';
import { TokenModule } from '../tokens/token.module';
import { WrapAbiService } from './services/wrap.abi.service';
import { WrapTransactionsService } from './services/wrap.transactions.service';
import { WrapResolver } from './wrap.resolver';
import { WrapService } from './services/wrap.service';

@Module({
    imports: [MXCommunicationModule, CachingModule, TokenModule],
    providers: [
        WrapService,
        WrapAbiService,
        WrapTransactionsService,
        WrapResolver,
    ],
    exports: [WrapAbiService, WrapService, WrapTransactionsService],
})
export class WrappingModule {}
