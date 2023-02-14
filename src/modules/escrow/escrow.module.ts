import { Module } from '@nestjs/common';
import { CommonAppModule } from 'src/common.app.module';
import { CachingModule } from 'src/services/caching/cache.module';
import { MXCommunicationModule } from 'src/services/multiversx-communication/mx.communication.module';
import { EscrowResolver } from './escrow.resolver';
import { EscrowAbiService } from './services/escrow.abi.service';
import { EscrowGetterService } from './services/escrow.getter.service';
import { EscrowTransactionService } from './services/escrow.transaction.service';

@Module({
    imports: [CommonAppModule, MXCommunicationModule, CachingModule],
    providers: [
        EscrowAbiService,
        EscrowGetterService,
        EscrowTransactionService,
        EscrowResolver,
    ],
})
export class EscrowModule {}
