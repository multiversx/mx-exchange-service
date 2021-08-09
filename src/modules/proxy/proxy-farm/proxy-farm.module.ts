import { Module } from '@nestjs/common';
import { ElrondCommunicationModule } from '../../../services/elrond-communication/elrond-communication.module';
import { ContextModule } from '../../../services/context/context.module';
import { AbiProxyFarmService } from './proxy-farm-abi.service';
import { TransactionsProxyFarmService } from './proxy-farm-transactions.service';
import { ProxyFarmService } from './proxy-farm.service';
import { RedisCacheService } from 'src/services/redis-cache.service';

@Module({
    imports: [ElrondCommunicationModule, ContextModule],
    providers: [
        AbiProxyFarmService,
        ProxyFarmService,
        TransactionsProxyFarmService,
        RedisCacheService,
    ],
    exports: [
        ProxyFarmService,
        AbiProxyFarmService,
        TransactionsProxyFarmService,
    ],
})
export class ProxyFarmModule {}
