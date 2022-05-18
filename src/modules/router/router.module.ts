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
import { CommonAppModule } from 'src/common.app.module';
import { AutoRouterService } from './services/auto-router/auto-router.service';
import { ContextModule } from 'src/services/context/context.module';
import { AutoRouterComputeService } from './services/auto-router/auto-router.compute.service';
import { WrappingModule } from '../wrapping/wrap.module';

@Module({
    imports: [
        CommonAppModule,
        ElrondCommunicationModule,
        CachingModule,
        PairModule,
        AWSModule,
        ContextModule,
        WrappingModule,
    ],
    providers: [
        RouterService,
        AbiRouterService,
        RouterGetterService,
        RouterSetterService,
        RouterComputeService,
        TransactionRouterService,
        RouterResolver,
        AutoRouterService,
        AutoRouterComputeService,
    ],
    exports: [
        AbiRouterService,
        RouterService,
        RouterGetterService,
        RouterSetterService,
        RouterComputeService,
        AutoRouterService,
        AutoRouterComputeService,
    ],
})
export class RouterModule {}
