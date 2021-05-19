import { Module } from '@nestjs/common';
import { PairModule } from 'src/dex/pair/pair.module';
import { ContextModule } from 'src/dex/utils/context.module';
import { CacheManagerModule } from 'src/services/cache-manager/cache-manager.module';
import { AbiProxyPairService } from './proxy-pair-abi.service';
import { TransactionsProxyPairService } from './proxy-pair-transactions.service';
import { ProxyPairService } from './proxy-pair.service';

@Module({
    imports: [CacheManagerModule, ContextModule, PairModule],
    providers: [
        AbiProxyPairService,
        ProxyPairService,
        TransactionsProxyPairService,
    ],
    exports: [ProxyPairService, TransactionsProxyPairService],
})
export class ProxyPairModule {}
