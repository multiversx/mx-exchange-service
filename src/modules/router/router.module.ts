import { Module } from '@nestjs/common';
import { RouterService } from './services/router.service';
import { RouterResolver } from './router.resolver';
import { ElrondCommunicationModule } from '../../services/elrond-communication/elrond-communication.module';
import { AbiRouterService } from './services/abi.router.service';
import { TransactionRouterService } from './services/transactions.router.service';
import { CachingModule } from '../../services/caching/cache.module';
import { RouterGetterService } from './services/router.getter.service';
import { RouterComputeService } from './services/router.compute.service';
import { PairModule } from '../pair/pair.module';
import { RouterSetterService } from './services/router.setter.service';
import { AWSModule } from 'src/services/aws/aws.module';

@Module({
    imports: [ElrondCommunicationModule, CachingModule, PairModule, AWSModule],
    providers: [
        RouterService,
        AbiRouterService,
        RouterGetterService,
        RouterSetterService,
        RouterComputeService,
        TransactionRouterService,
        RouterResolver,
    ],
    exports: [
        RouterService,
        RouterGetterService,
        RouterSetterService,
        RouterComputeService,
    ],
})
export class RouterModule {}
