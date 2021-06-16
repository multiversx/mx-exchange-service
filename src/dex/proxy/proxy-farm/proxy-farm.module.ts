import { Module } from '@nestjs/common';
import { ContextModule } from 'src/dex/utils/context.module';
import { CacheManagerModule } from 'src/services/cache-manager/cache-manager.module';
import { AbiProxyFarmService } from './proxy-farm-abi.service';
import { TransactionsProxyFarmService } from './proxy-farm-transactions.service';
import { ProxyFarmService } from './proxy-farm.service';

@Module({
    imports: [CacheManagerModule, ContextModule],
    providers: [
        AbiProxyFarmService,
        ProxyFarmService,
        TransactionsProxyFarmService,
    ],
    exports: [ProxyFarmService, TransactionsProxyFarmService],
})
export class ProxyFarmModule {}
