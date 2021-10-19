import { forwardRef, Module } from '@nestjs/common';
import { PairModule } from '../../pair/pair.module';
import { AbiProxyPairService } from './proxy-pair-abi.service';
import { TransactionsProxyPairService } from './proxy-pair-transactions.service';
import { ProxyPairService } from './proxy-pair.service';
import { ContextModule } from '../../../services/context/context.module';
import { ElrondCommunicationModule } from '../../../services/elrond-communication/elrond-communication.module';
import { WrappingModule } from '../../../modules/wrapping/wrap.module';
import { CachingModule } from '../../../services/caching/cache.module';
import { ProxyModule } from '../proxy.module';

@Module({
    imports: [
        ElrondCommunicationModule,
        CachingModule,
        ContextModule,
        PairModule,
        WrappingModule,
        forwardRef(() => ProxyModule),
    ],
    providers: [
        AbiProxyPairService,
        ProxyPairService,
        TransactionsProxyPairService,
    ],
    exports: [
        ProxyPairService,
        AbiProxyPairService,
        TransactionsProxyPairService,
    ],
})
export class ProxyPairModule {}
