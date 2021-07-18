import { Module } from '@nestjs/common';
import { PairModule } from '../../pair/pair.module';
import { AbiProxyPairService } from './proxy-pair-abi.service';
import { TransactionsProxyPairService } from './proxy-pair-transactions.service';
import { ProxyPairService } from './proxy-pair.service';
import { ContextModule } from '../../../services/context/context.module';
import { ElrondCommunicationModule } from '../../../services/elrond-communication/elrond-communication.module';
import { WrappingModule } from 'src/modules/wrapping/wrap.module';
import { RedisCacheService } from 'src/services/redis-cache.service';

@Module({
    imports: [
        ElrondCommunicationModule,
        ContextModule,
        PairModule,
        WrappingModule,
    ],
    providers: [
        AbiProxyPairService,
        ProxyPairService,
        TransactionsProxyPairService,
        RedisCacheService,
    ],
    exports: [ProxyPairService, TransactionsProxyPairService],
})
export class ProxyPairModule {}
