import { Module } from '@nestjs/common';
import { RouterService } from './router.service';
import { RouterResolver } from './router.resolver';
import { ElrondCommunicationModule } from '../../services/elrond-communication/elrond-communication.module';
import { RedisCacheService } from '../../services/redis-cache.service';
import { AbiRouterService } from './abi.router.service';
import { TransactionRouterService } from './transactions.router.service';

@Module({
    imports: [ElrondCommunicationModule],
    providers: [
        RouterService,
        AbiRouterService,
        TransactionRouterService,
        RedisCacheService,
        RouterResolver,
    ],
    exports: [RouterService],
})
export class RouterModule {}
