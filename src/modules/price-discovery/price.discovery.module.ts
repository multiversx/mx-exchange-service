import { Module } from '@nestjs/common';
import { MXCommunicationModule } from 'src/services/multiversx-communication/mx.communication.module';
import { PairModule } from '../pair/pair.module';
import { TokenModule } from '../tokens/token.module';
import { WrappingModule } from '../wrapping/wrap.module';
import { PriceDiscoveryResolver } from './price.discovery.resolver';
import { PriceDiscoveryAbiService } from './services/price.discovery.abi.service';
import { PriceDiscoveryComputeService } from './services/price.discovery.compute.service';
import { PriceDiscoveryService } from './services/price.discovery.service';
import { PriceDiscoverySetterService } from './services/price.discovery.setter.service';
import { PriceDiscoveryTransactionService } from './services/price.discovery.transactions.service';

@Module({
    imports: [MXCommunicationModule, PairModule, WrappingModule, TokenModule],
    providers: [
        PriceDiscoveryService,
        PriceDiscoveryAbiService,
        PriceDiscoveryComputeService,
        PriceDiscoverySetterService,
        PriceDiscoveryTransactionService,
        PriceDiscoveryResolver,
    ],
    exports: [
        PriceDiscoveryAbiService,
        PriceDiscoveryService,
        PriceDiscoverySetterService,
        PriceDiscoveryComputeService,
    ],
})
export class PriceDiscoveryModule {}
