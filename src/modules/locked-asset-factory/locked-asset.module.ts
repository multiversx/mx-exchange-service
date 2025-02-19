import { Module } from '@nestjs/common';
import { LockedAssetResolver } from './locked-asset.resolver';
import { LockedAssetService } from './services/locked-asset.service';
import { AbiLockedAssetService } from './services/abi-locked-asset.service';
import { TransactionsLockedAssetService } from './services/transaction-locked-asset.service';
import { ContextModule } from '../../services/context/context.module';
import { MXCommunicationModule } from '../../services/multiversx-communication/mx.communication.module';
import { LockedAssetGetterService } from './services/locked.asset.getter.service';
import { TokenModule } from '../tokens/token.module';

@Module({
    imports: [MXCommunicationModule, ContextModule, TokenModule],
    providers: [
        AbiLockedAssetService,
        TransactionsLockedAssetService,
        LockedAssetService,
        LockedAssetGetterService,
        LockedAssetResolver,
    ],
    exports: [
        LockedAssetService,
        LockedAssetGetterService,
        AbiLockedAssetService,
    ],
})
export class LockedAssetModule {}
