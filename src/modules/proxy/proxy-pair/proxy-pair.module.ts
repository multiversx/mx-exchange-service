import { Module } from '@nestjs/common';
import { PairModule } from '../../pair/pair.module';
import { CacheManagerModule } from '../../../services/cache-manager/cache-manager.module';
import { AbiProxyPairService } from './proxy-pair-abi.service';
import { TransactionsProxyPairService } from './proxy-pair-transactions.service';
import { ProxyPairService } from './proxy-pair.service';
import { ContextModule } from '../../../services/context/context.module';
import { ElrondCommunicationModule } from '../../../services/elrond-communication/elrond-communication.module';

@Module({
    imports: [
        ElrondCommunicationModule,
        CacheManagerModule,
        ContextModule,
        PairModule,
    ],
    providers: [
        AbiProxyPairService,
        ProxyPairService,
        TransactionsProxyPairService,
    ],
    exports: [ProxyPairService, TransactionsProxyPairService],
})
export class ProxyPairModule {}
