import { Module } from '@nestjs/common';
import { ContextModule } from '../../services/context/context.module';
import { ElrondCommunicationModule } from '../../services/elrond-communication/elrond-communication.module';
import { ProxyFarmModule } from '../proxy/proxy-farm/proxy-farm.module';
import { ProxyPairModule } from '../proxy/proxy-pair/proxy-pair.module';
import { TokenMergingAbiService } from './token.merging.abi.service';
import { TokenMergingResolver } from './token.merging.resolver';
import { TokenMergingService } from './token.merging.service';
import { TokenMergingTransactionsService } from './token.merging.transactions.service';

@Module({
    imports: [
        ElrondCommunicationModule,
        ContextModule,
        ProxyPairModule,
        ProxyFarmModule,
    ],
    providers: [
        TokenMergingTransactionsService,
        TokenMergingAbiService,
        TokenMergingService,
        TokenMergingResolver,
    ],
    exports: [TokenMergingTransactionsService, TokenMergingService],
})
export class TokenMergingModule {}
