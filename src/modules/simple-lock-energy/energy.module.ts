import { Module } from '@nestjs/common';
import { CachingModule } from 'src/services/caching/cache.module';
import { ElrondCommunicationModule } from 'src/services/elrond-communication/elrond-communication.module';
import { EnergyResolver } from './energy.resolver';
import { EnergyAbiService } from './services/energy.abi.service';
import { EnergyComputeService } from './services/energy.compute.service';
import { EnergyGetterService } from './services/energy.getter.service';
import { EnergyService } from './services/energy.service';
import { EnergySetterService } from './services/energy.setter.service';
import { EnergyTransactionService } from './services/energy.transaction.service';

@Module({
    imports: [CachingModule, ElrondCommunicationModule],
    providers: [
        EnergyAbiService,
        EnergyService,
        EnergyGetterService,
        EnergySetterService,
        EnergyComputeService,
        EnergyTransactionService,
        EnergyResolver,
    ],
})
export class EnergyModule {}
