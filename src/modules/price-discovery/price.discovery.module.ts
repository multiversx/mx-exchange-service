import { Module } from '@nestjs/common';
import { CachingModule } from 'src/services/caching/cache.module';
import { ContextModule } from 'src/services/context/context.module';
import { ElrondCommunicationModule } from 'src/services/elrond-communication/elrond-communication.module';
import { PairModule } from '../pair/pair.module';
import { WrappingModule } from '../wrapping/wrap.module';
import { PriceDiscoveryResolver } from './price.discovery.resolver';
import { PriceDiscoveryAbiService } from './services/price.discovery.abi.service';
import { PriceDiscoveryComputeService } from './services/price.discovery.compute.service';
import { PriceDiscoveryGetterService } from './services/price.discovery.getter.service';
import { PriceDiscoveryService } from './services/price.discovery.service';
import { PriceDiscoverySetterService } from './services/price.discovery.setter.service';
import { PriceDiscoveryTransactionService } from './services/price.discovery.transactions.service';

@Module({
    imports: [
        ElrondCommunicationModule,
        ContextModule,
        CachingModule,
        PairModule,
        WrappingModule,
    ],
    providers: [
        PriceDiscoveryService,
        PriceDiscoveryAbiService,
        PriceDiscoveryComputeService,
        PriceDiscoveryGetterService,
        PriceDiscoverySetterService,
        PriceDiscoveryTransactionService,
        PriceDiscoveryResolver,
    ],
    exports: [
        PriceDiscoveryAbiService,
        PriceDiscoveryService,
        PriceDiscoveryGetterService,
        PriceDiscoverySetterService,
        PriceDiscoveryComputeService,
    ],
})
export class PriceDiscoveryModule {}
