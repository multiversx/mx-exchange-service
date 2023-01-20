import { Module } from '@nestjs/common';
import { RouterService } from './services/router.service';
import { RouterResolver } from './router.resolver';
import { MXCommunicationModule } from '../../services/multiversx-communication/mx.communication.module';
import { AbiRouterService } from './services/abi.router.service';
import { TransactionRouterService } from './services/transactions.router.service';
import { CachingModule } from '../../services/caching/cache.module';
import { RouterGetterService } from './services/router.getter.service';
import { RouterComputeService } from './services/router.compute.service';
import { PairModule } from '../pair/pair.module';
import { RouterSetterService } from './services/router.setter.service';
import { CommonAppModule } from 'src/common.app.module';
import { ContextModule } from 'src/services/context/context.module';
import { WrappingModule } from '../wrapping/wrap.module';
import { RemoteConfigModule } from '../remote-config/remote-config.module';
import { MetricsService } from 'src/endpoints/metrics/metrics.service';
import { ElasticService } from 'src/helpers/elastic.service';
import { SwapEnableConfigResolver } from './swap.enable.config.resolver';
import { SimpleLockModule } from '../simple-lock/simple.lock.module';

@Module({
    imports: [
        CommonAppModule,
        MXCommunicationModule,
        CachingModule,
        PairModule,
        SimpleLockModule,
        ContextModule,
        WrappingModule,
        RemoteConfigModule,
    ],
    providers: [
        RouterService,
        AbiRouterService,
        RouterGetterService,
        RouterSetterService,
        RouterComputeService,
        TransactionRouterService,
        MetricsService,
        ElasticService,
        SwapEnableConfigResolver,
        RouterResolver,
    ],
    exports: [
        AbiRouterService,
        RouterService,
        RouterGetterService,
        RouterSetterService,
        RouterComputeService,
    ],
})
export class RouterModule {}
