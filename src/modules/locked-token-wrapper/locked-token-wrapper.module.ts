import { Module } from '@nestjs/common';
import { MXCommunicationModule } from '../../services/multiversx-communication/mx.communication.module';
import { LockedTokenWrapperAbiService } from './services/locked-token-wrapper.abi.service';
import { LockedTokenWrapperTransactionService } from './services/locked-token-wrapper.transaction.service';
import { LockedTokenWrapperResolver } from './locked-token-wrapper.resolver';
import { LockedTokenWrapperService } from './services/locked-token-wrapper.service';
import { EnergyModule } from '../energy/energy.module';
import { ContextModule } from 'src/services/context/context.module';

@Module({
    imports: [MXCommunicationModule, ContextModule, EnergyModule],
    providers: [
        LockedTokenWrapperAbiService,
        LockedTokenWrapperTransactionService,
        LockedTokenWrapperService,
        LockedTokenWrapperResolver,
    ],
    exports: [LockedTokenWrapperService, LockedTokenWrapperAbiService],
})
export class LockedTokenWrapperModule {}
