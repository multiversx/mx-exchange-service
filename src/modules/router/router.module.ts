import { Module } from '@nestjs/common';
import { RouterService } from './router.service';
import { RouterResolver } from './router.resolver';
import { ElrondCommunicationModule } from '../../services/elrond-communication/elrond-communication.module';
import { AbiRouterService } from './abi.router.service';
import { TransactionRouterService } from './transactions.router.service';
import { CachingModule } from '../../services/caching/cache.module';

@Module({
    imports: [ElrondCommunicationModule, CachingModule],
    providers: [
        RouterService,
        AbiRouterService,
        TransactionRouterService,
        RouterResolver,
    ],
    exports: [RouterService],
})
export class RouterModule {}
