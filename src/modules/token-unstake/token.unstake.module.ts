import { Module } from '@nestjs/common';
import { CachingModule } from 'src/services/caching/cache.module';
import { MXCommunicationModule } from 'src/services/multiversx-communication/mx.communication.module';
import { TokenUnstakeAbiService } from './services/token.unstake.abi.service';
import { TokenUnstakeGetterService } from './services/token.unstake.getter.service';
import { TokenUnstakeSetterService } from './services/token.unstake.setter.service';
import { TokenUnstakeTransactionService } from './services/token.unstake.transaction.service';
import { TokenUnstakeResolver } from './token.unstake.resolver';

@Module({
    imports: [MXCommunicationModule, CachingModule],
    providers: [
        TokenUnstakeAbiService,
        TokenUnstakeGetterService,
        TokenUnstakeSetterService,
        TokenUnstakeTransactionService,
        TokenUnstakeResolver,
    ],
    exports: [TokenUnstakeSetterService],
})
export class TokenUnstakeModule {}
