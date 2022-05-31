import { Module } from '@nestjs/common';
import { CommonAppModule } from 'src/common.app.module';
import { AWSModule } from 'src/services/aws/aws.module';
import { CachingModule } from 'src/services/caching/cache.module';
import { ContextModule } from 'src/services/context/context.module';
import { ElrondCommunicationModule } from 'src/services/elrond-communication/elrond-communication.module';
import { PairModule } from '../pair/pair.module';
import { AutoRouterService } from './services/auto-router.service';
import { AutoRouterComputeService } from './services/auto-router.compute.service';
import { WrappingModule } from '../wrapping/wrap.module';
import { RouterModule } from '../router/router.module';
import { AutoRouterTransactionService } from './services/auto-router.transactions.service';
import { AutoRouterResolver } from './auto-router.resolver';
import { PairTransactionService } from '../pair/services/pair.transactions.service';

@Module({
    imports: [
        ContextModule,
        CommonAppModule,
        ElrondCommunicationModule,
        CachingModule,
        PairModule,
        AWSModule,
        WrappingModule,
        RouterModule,
    ],
    providers: [
        AutoRouterResolver,
        AutoRouterService,
        AutoRouterComputeService,
        AutoRouterTransactionService,
        PairTransactionService,
    ],
    exports: [],
})
export class AutoRouterModule {}
