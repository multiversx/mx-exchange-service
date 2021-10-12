import { Module } from '@nestjs/common';
import { RouterService } from './router.service';
import { RouterResolver } from './router.resolver';
import { ElrondCommunicationModule } from '../../services/elrond-communication/elrond-communication.module';
import { AbiRouterService } from './abi.router.service';
import { TransactionRouterService } from './transactions.router.service';
import { CachingModule } from '../../services/caching/cache.module';
import { RouterGetterService } from './router.getter.service';
import { RouterComputeService } from './router.compute.service';
import { PairModule } from '../pair/pair.module';
import { RouterSetterService } from './router.setter.service';
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
