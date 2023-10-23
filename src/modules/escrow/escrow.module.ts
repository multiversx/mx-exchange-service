import { Module } from '@nestjs/common';
import { CommonAppModule } from 'src/common.app.module';
import { ContextModule } from 'src/services/context/context.module';
import { MXCommunicationModule } from 'src/services/multiversx-communication/mx.communication.module';
import { EscrowResolver } from './escrow.resolver';
import { EscrowAbiService } from './services/escrow.abi.service';
import { EscrowComputeService } from './services/escrow.compute.service';
import { EscrowTransactionService } from './services/escrow.transaction.service';
import { EscrowSetterService } from './services/escrow.setter.service';

@Module({
    imports: [CommonAppModule, MXCommunicationModule, ContextModule],
    providers: [
        EscrowAbiService,
        EscrowSetterService,
        EscrowComputeService,
        EscrowTransactionService,
        EscrowResolver,
    ],
    exports: [EscrowAbiService, EscrowSetterService],
})
export class EscrowModule {}
