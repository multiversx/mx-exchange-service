import { Module } from '@nestjs/common';
import { CommonAppModule } from 'src/common.app.module';
import { CachingModule } from 'src/services/caching/cache.module';
import { MXCommunicationModule } from 'src/services/multiversx-communication/mx.communication.module';
import { EscrowResolver } from './escrow.resolver';
import { EscrowAbiService } from './services/escrow.abi.service';
import { EscrowGetterService } from './services/escrow.getter.service';

@Module({
    imports: [CommonAppModule, MXCommunicationModule, CachingModule],
    providers: [EscrowAbiService, EscrowGetterService, EscrowResolver],
})
export class EscrowModule {}
