import { forwardRef, Module } from '@nestjs/common';
import { ElrondCommunicationModule } from '../../../../services/elrond-communication/elrond-communication.module';
import { ContextModule } from '../../../../services/context/context.module';
import { AbiProxyFarmService } from './proxy-farm-abi.service';
import { TransactionsProxyFarmService } from './proxy-farm-transactions.service';
import { ProxyFarmGetterService } from './proxy-farm.getter.service';
import { CachingModule } from '../../../../services/caching/cache.module';
import { ProxyPairModule } from '../proxy-pair/proxy-pair.module';
import { ProxyModule } from '../../proxy.module';
import { FarmModule } from 'src/modules/farm/farm.module';
import { PairModule } from 'src/modules/pair/pair.module';
import { TokenModule } from 'src/modules/tokens/token.module';

@Module({
    imports: [
        ElrondCommunicationModule,
        CachingModule,
        ContextModule,
        ProxyPairModule,
        forwardRef(() => ProxyModule),
        FarmModule,
        PairModule,
        TokenModule,
    ],
    providers: [
        AbiProxyFarmService,
        ProxyFarmGetterService,
        TransactionsProxyFarmService,
    ],
    exports: [
        ProxyFarmGetterService,
        AbiProxyFarmService,
        TransactionsProxyFarmService,
    ],
})
export class ProxyFarmModule {}
