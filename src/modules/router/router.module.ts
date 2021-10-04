import { Module } from '@nestjs/common';
import { RouterService } from './router.service';
import { RouterResolver } from './router.resolver';
import { ElrondCommunicationModule } from '../../services/elrond-communication/elrond-communication.module';
import { AbiRouterService } from './abi.router.service';
import { TransactionRouterService } from './transactions.router.service';
import { CachingModule } from '../../services/caching/cache.module';
import { RouterGetterService } from './router.getter.service';

@Module({
    imports: [ElrondCommunicationModule, CachingModule],
    providers: [
        RouterService,
        AbiRouterService,
        RouterGetterService,
        TransactionRouterService,
        RouterResolver,
    ],
    exports: [
        RouterService,
        RouterGetterService,
    ],
})
export class RouterModule {}
