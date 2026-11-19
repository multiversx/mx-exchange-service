import { MiddlewareConsumer, Module } from '@nestjs/common';
import { RouterModule } from './modules/router/router.module';
import { PairModule } from './modules/pair/pair.module';
import { FarmModule } from './modules/farm/farm.module';
import { DistributionModule } from './modules/distribution/distribution.module';
import { WrappingModule } from './modules/wrapping/wrap.module';
import { ProxyModule } from './modules/proxy/proxy.module';
import { LockedAssetModule } from './modules/locked-asset-factory/locked-asset.module';
import { UserModule } from './modules/user/user.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { CommonAppModule } from './common.app.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { StakingModule } from './modules/staking/staking.module';
import { StakingProxyModule } from './modules/staking-proxy/staking.proxy.module';
import { MetabondingModule } from './modules/metabonding/metabonding.module';
import { PriceDiscoveryModule } from './modules/price-discovery/price.discovery.module';
import { SimpleLockModule } from './modules/simple-lock/simple.lock.module';
import { TokenModule } from './modules/tokens/token.module';
import { AutoRouterModule } from './modules/auto-router/auto-router.module';
import { FeesCollectorModule } from './modules/fees-collector/fees-collector.module';
import { EnergyModule } from './modules/energy/energy.module';
import { TokenUnstakeModule } from './modules/token-unstake/token.unstake.module';
import { LockedTokenWrapperModule } from './modules/locked-token-wrapper/locked-token-wrapper.module';
import { EscrowModule } from './modules/escrow/escrow.module';
import { GovernanceModule } from './modules/governance/governance.module';
import { DynamicModuleUtils } from './utils/dynamic.module.utils';
import '@multiversx/sdk-nestjs-common/lib/utils/extensions/array.extensions';
import { PositionCreatorModule } from './modules/position-creator/position.creator.module';
import { ComposableTasksModule } from './modules/composable-tasks/composable.tasks.module';
import { AggregatorsModule } from './modules/aggregators/aggregators.module';
import { QueryMetricsPlugin } from './utils/query.metrics.plugin';
import { CurrencyConverterModule } from './modules/currency-converter/currency.converter.module';
import { TradingContestModule } from './modules/trading-contest/trading.contest.module';
import { DustConverterModule } from './modules/dust-converter/dust.converter.module';
import {
    applyPublicEdgeMiddleware,
    publicComplexityModule,
    publicGraphQLModule,
} from './utils/public.edge';

@Module({
    imports: [
        CommonAppModule,
        publicGraphQLModule(),
        RouterModule,
        AutoRouterModule,
        PairModule,
        FarmModule,
        StakingModule,
        StakingProxyModule,
        DistributionModule,
        ProxyModule,
        LockedAssetModule,
        MetabondingModule,
        PriceDiscoveryModule,
        SimpleLockModule,
        WrappingModule,
        TokenModule,
        UserModule,
        AnalyticsModule,
        SubscriptionsModule,
        FeesCollectorModule,
        EnergyModule,
        TokenUnstakeModule,
        LockedTokenWrapperModule,
        EscrowModule,
        GovernanceModule,
        PositionCreatorModule,
        ComposableTasksModule,
        DynamicModuleUtils.getCacheModule(),
        AggregatorsModule,
        CurrencyConverterModule,
        publicComplexityModule(),
        TradingContestModule,
        DustConverterModule,
    ],
    providers: [QueryMetricsPlugin],
})
export class PublicAppModule {
    configure(consumer: MiddlewareConsumer) {
        applyPublicEdgeMiddleware(consumer);
    }
}
