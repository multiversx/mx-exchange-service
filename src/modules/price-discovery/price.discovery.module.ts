import { Module } from '@nestjs/common';
import { CachingModule } from 'src/services/caching/cache.module';
import { ContextModule } from 'src/services/context/context.module';
import { ElrondCommunicationModule } from 'src/services/elrond-communication/elrond-communication.module';
import { PriceDiscoveryResolver } from './price.discovery.resolver';
import { PriceDiscoveryAbiService } from './services/price.discovery.abi.service';
import { PriceDiscoveryGetterService } from './services/price.discovery.getter.service';
import { PriceDiscoveryService } from './services/price.discovery.service';
import { PriceDiscoverySetterService } from './services/price.discovery.setter.service';
import { PriceDiscoveryTransactionService } from './services/price.discovery.transactions.service';

@Module({
    imports: [ElrondCommunicationModule, ContextModule, CachingModule],
    providers: [
        PriceDiscoveryService,
        PriceDiscoveryAbiService,
        PriceDiscoveryGetterService,
        PriceDiscoverySetterService,
        PriceDiscoveryTransactionService,
        PriceDiscoveryResolver,
    ],
    exports: [],
})
export class PriceDiscoveryModule {}
