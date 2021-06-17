import { Module } from '@nestjs/common';
import { CacheManagerModule } from 'src/services/cache-manager/cache-manager.module';
import { ElrondCommunicationModule } from '../../../services/elrond-communication/elrond-communication.module';
import { ContextModule } from '../../../services/context/context.module';
import { AbiProxyFarmService } from './proxy-farm-abi.service';
import { TransactionsProxyFarmService } from './proxy-farm-transactions.service';
import { ProxyFarmService } from './proxy-farm.service';

@Module({
    imports: [ElrondCommunicationModule, CacheManagerModule, ContextModule],
    providers: [
        AbiProxyFarmService,
        ProxyFarmService,
        TransactionsProxyFarmService,
    ],
    exports: [ProxyFarmService, TransactionsProxyFarmService],
})
export class ProxyFarmModule {}
