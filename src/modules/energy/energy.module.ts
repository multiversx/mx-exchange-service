import { Module } from '@nestjs/common';
import { CommonAppModule } from 'src/common.app.module';
import { ContextModule } from 'src/services/context/context.module';
import { MXCommunicationModule } from 'src/services/multiversx-communication/mx.communication.module';
import { TokenModule } from '../tokens/token.module';
import { EnergyResolver, UserEnergyResolver } from './energy.resolver';
import { EnergyAbiService } from './services/energy.abi.service';
import { EnergyComputeService } from './services/energy.compute.service';
import { EnergyService } from './services/energy.service';
import { EnergySetterService } from './services/energy.setter.service';
import { EnergyTransactionService } from './services/energy.transaction.service';
import { EnergyUpdateResolver } from './energy.update.resolver';

@Module({
    imports: [
        CommonAppModule,
        MXCommunicationModule,
        ContextModule,
        TokenModule,
    ],
    providers: [
        EnergyService,
        EnergyAbiService,
        EnergySetterService,
        EnergyComputeService,
        EnergyTransactionService,
        EnergyResolver,
        EnergyUpdateResolver,
        UserEnergyResolver,
    ],
    exports: [
        EnergyAbiService,
        EnergySetterService,
        EnergyComputeService,
        EnergyService,
    ],
})
export class EnergyModule {}
