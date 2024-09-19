import { forwardRef, Module } from '@nestjs/common';
import { PairService } from './services/pair.service';
import {
    PairCompoundedAPRResolver,
    PairResolver,
    PairRewardTokensResolver,
} from './pair.resolver';
import { PairAbiService } from './services/pair.abi.service';
import { PairTransactionService } from './services/pair.transactions.service';
import { ContextModule } from '../../services/context/context.module';
import { MXCommunicationModule } from '../../services/multiversx-communication/mx.communication.module';
import { WrappingModule } from '../wrapping/wrap.module';
import { PairComputeService } from './services/pair.compute.service';
import { PairSetterService } from './services/pair.setter.service';
import { AnalyticsModule as AnalyticsServicesModule } from 'src/services/analytics/analytics.module';
import { DatabaseModule } from 'src/services/database/database.module';
import { TokenModule } from '../tokens/token.module';
import { RouterModule } from '../router/router.module';
import { CommonAppModule } from 'src/common.app.module';
import { ComposableTasksModule } from '../composable-tasks/composable.tasks.module';
import { RemoteConfigModule } from '../remote-config/remote-config.module';
import { StakingProxyModule } from '../staking-proxy/staking.proxy.module';
import { FarmModuleV2 } from '../farm/v2/farm.v2.module';
import { PairFilteringService } from './services/pair.filtering.service';
import { StakingModule } from '../staking/staking.module';
import { EnergyModule } from '../energy/energy.module';
import { PairAbiLoader } from './services/pair.abi.loader';
import { PairComputeLoader } from './services/pair.compute.loader';
import { ElasticSearchModule } from 'src/services/elastic-search/elastic.search.module';
@Module({
    imports: [
        CommonAppModule,
        MXCommunicationModule,
        ContextModule,
        WrappingModule,
        AnalyticsServicesModule,
        DatabaseModule,
        forwardRef(() => RouterModule),
        forwardRef(() => TokenModule),
        ComposableTasksModule,
        RemoteConfigModule,
        FarmModuleV2,
        StakingProxyModule,
        StakingModule,
        EnergyModule,
        ElasticSearchModule,
    ],
    providers: [
        PairService,
        PairSetterService,
        PairComputeService,
        PairAbiService,
        PairTransactionService,
        PairFilteringService,
        PairAbiLoader,
        PairComputeLoader,
        PairResolver,
        PairFilteringService,
        PairCompoundedAPRResolver,
        PairRewardTokensResolver,
    ],
    exports: [
        PairService,
        PairSetterService,
        PairComputeService,
        PairAbiService,
        PairFilteringService,
    ],
})
export class PairModule {}
