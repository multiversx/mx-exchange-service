import { Module } from '@nestjs/common';
import { MXCommunicationModule } from '../../services/multiversx-communication/mx.communication.module';
import { CachingModule } from '../../services/caching/cache.module';
import { LockedTokenWrapperAbiService } from './services/locked-token-wrapper.abi.service';
import { LockedTokenWrapperGetterService } from './services/locked-token-wrapper.getter.service';
import { LockedTokenWrapperTransactionService } from './services/locked-token-wrapper.transaction.service';
import { LockedTokenWrapperResolver } from './locked-token-wrapper.resolver';
import { LockedTokenWrapperService } from './services/locked-token-wrapper.service';
import { EnergyModule } from '../energy/energy.module';

@Module({
    imports: [MXCommunicationModule, CachingModule, EnergyModule],
    providers: [
        LockedTokenWrapperAbiService,
        LockedTokenWrapperGetterService,
        LockedTokenWrapperTransactionService,
        LockedTokenWrapperService,
        LockedTokenWrapperResolver,
    ],
    exports: [LockedTokenWrapperGetterService, LockedTokenWrapperService],
})
export class LockedTokenWrapperModule {}
