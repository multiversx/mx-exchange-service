import { Module } from '@nestjs/common';
import { CachingModule } from 'src/services/caching/cache.module';
import { ElrondCommunicationModule } from 'src/services/elrond-communication/elrond-communication.module';
import { TokenUnstakeAbiService } from './services/token.unstake.abi.service';
import { TokenUnstakeGetterService } from './services/token.unstake.getter.service';
import { TokenUnstakeSetterService } from './services/token.unstake.setter.service';
import { TokenUnstakeTransactionService } from './services/token.unstake.transaction.service';
import { TokenUnstakeResolver } from './token.unstake.resolver';

@Module({
    imports: [ElrondCommunicationModule, CachingModule],
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
