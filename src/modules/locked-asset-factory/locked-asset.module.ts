import { Module } from '@nestjs/common';
import { ProxyModule } from '../proxy/proxy.module';
import { LockedAssetResolver } from './locked-asset.resolver';
import { LockedAssetService } from './locked-asset.service';
import { AbiLockedAssetService } from './abi-locked-asset.service';
import { TransactionsLockedAssetService } from './transaction-locked-asset.service';
import { ContextModule } from '../../services/context/context.module';
import { ElrondCommunicationModule } from '../../services/elrond-communication/elrond-communication.module';
import { CachingModule } from '../../services/caching/cache.module';

@Module({
    imports: [
        ElrondCommunicationModule,
        CachingModule,
        ContextModule,
        ProxyModule,
    ],
    providers: [
        AbiLockedAssetService,
        TransactionsLockedAssetService,
        LockedAssetService,
        LockedAssetResolver,
    ],
    exports: [LockedAssetService],
})
export class LockedAssetModule {}
