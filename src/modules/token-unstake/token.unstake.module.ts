import { Module } from '@nestjs/common';
import { MXCommunicationModule } from 'src/services/multiversx-communication/mx.communication.module';
import { TokenUnstakeAbiService } from './services/token.unstake.abi.service';
import { TokenUnstakeSetterService } from './services/token.unstake.setter.service';
import { TokenUnstakeTransactionService } from './services/token.unstake.transaction.service';
import { TokenUnstakeResolver } from './token.unstake.resolver';

@Module({
    imports: [MXCommunicationModule],
    providers: [
        TokenUnstakeAbiService,
        TokenUnstakeSetterService,
        TokenUnstakeTransactionService,
        TokenUnstakeResolver,
    ],
    exports: [TokenUnstakeSetterService],
})
export class TokenUnstakeModule {}
