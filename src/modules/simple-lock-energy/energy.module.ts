import { Module } from '@nestjs/common';
import { CachingModule } from 'src/services/caching/cache.module';
import { ElrondCommunicationModule } from 'src/services/elrond-communication/elrond-communication.module';
import { EnergyResolver } from './energy.resolver';
import { EnergyAbiService } from './services/energy.abi.service';
import { EnergyGetterService } from './services/energy.getter.service';
import { EnergySetterService } from './services/energy.setter.service';
import { EnergyTransactionService } from './services/energy.transaction.service';

@Module({
    imports: [CachingModule, ElrondCommunicationModule],
    providers: [
        EnergyAbiService,
        EnergyGetterService,
        EnergySetterService,
        EnergyTransactionService,
        EnergyResolver,
    ],
})
export class EnergyModule {}
