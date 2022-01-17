import { Module } from '@nestjs/common';
import { CachingModule } from 'src/services/caching/cache.module';
import { ContextModule } from 'src/services/context/context.module';
import { ElrondCommunicationModule } from 'src/services/elrond-communication/elrond-communication.module';
import { PriceDiscoveryResolver } from './price.discovery.resolver';
import { PriceDiscoveryAbiService } from './services/price.discovery.abi.service';
import { PriceDiscoveryGetterService } from './services/price.discovery.getter.service';
import { PriceDiscoverySetterService } from './services/price.discovery.setter.service';

@Module({
    imports: [ElrondCommunicationModule, ContextModule, CachingModule],
    providers: [
        PriceDiscoveryAbiService,
        PriceDiscoveryGetterService,
        PriceDiscoverySetterService,
        PriceDiscoveryResolver,
    ],
    exports: [],
})
export class PairModule {}
