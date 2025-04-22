import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PairModule } from '../modules/pair/pair.module';
import { ContextModule } from './context/context.module';
import { CacheWarmerService } from './crons/cache.warmer.service';
import { ProxyModule } from 'src/modules/proxy/proxy.module';
import { ProxyFarmModule } from 'src/modules/proxy/services/proxy-farm/proxy.farm.module';
import { ProxyPairModule } from 'src/modules/proxy/services/proxy-pair/proxy.pair.module';
import { PairCacheWarmerService } from './crons/pair.cache.warmer.service';
import { FarmCacheWarmerService } from './crons/farm.cache.warmer.service';
import { ProxyCacheWarmerService } from './crons/proxy.cache.warmer.service';
import { MXCommunicationModule } from './multiversx-communication/mx.communication.module';
import { CommonAppModule } from 'src/common.app.module';
import { AnalyticsCacheWarmerService } from './crons/analytics.cache.warmer.service';
import { AnalyticsModule } from 'src/modules/analytics/analytics.module';
import { TransactionProcessorService } from './crons/transaction.processor.service';
import { StakingModule } from 'src/modules/staking/staking.module';
import { StakingCacheWarmerService } from './crons/staking.cache.warmer.service';
import { StakingProxyCacheWarmerService } from './crons/staking.proxy.cache.warmer.service';
import { StakingProxyModule } from 'src/modules/staking-proxy/staking.proxy.module';
import { MetabondingCacheWarmerService } from './crons/metabonding.cache.warmer.service';
import { MetabondingModule } from 'src/modules/metabonding/metabonding.module';
import { PriceDiscoveryCacheWarmerService } from './crons/price.discovery.cache.warmer.service';
import { PriceDiscoveryModule } from 'src/modules/price-discovery/price.discovery.module';
import { RemoteConfigModule } from 'src/modules/remote-config/remote-config.module';
import { RouterModule } from 'src/modules/router/router.module';
import { TokenModule } from 'src/modules/tokens/token.module';
import { AWSQueryCacheWarmerService } from './crons/aws.query.cache.warmer.service';
import { FarmModuleV1_2 } from 'src/modules/farm/v1.2/farm.v1.2.module';
import { FarmModuleV1_3 } from 'src/modules/farm/v1.3/farm.v1.3.module';
import { FarmModule } from 'src/modules/farm/farm.module';
import { AnalyticsModule as AnalyticsServicesModule } from 'src/services/analytics/analytics.module';
import { DynamicModuleUtils } from 'src/utils/dynamic.module.utils';
import { GovernanceCacheWarmerService } from './crons/governance.cache.warmer.service';
import { GovernanceModule } from '../modules/governance/governance.module';
import { TokensCacheWarmerService } from './crons/tokens.cache.warmer.service';
import { FarmModuleV2 } from 'src/modules/farm/v2/farm.v2.module';
import { EscrowCacheWarmerService } from './crons/escrow.cache.warmer.service';
import { EscrowModule } from 'src/modules/escrow/escrow.module';
import { FeesCollectorCacheWarmerService } from './crons/fees.collector.cache.warmer.service';
import { FeesCollectorModule } from 'src/modules/fees-collector/fees-collector.module';
import { WeekTimekeepingModule } from 'src/submodules/week-timekeeping/week-timekeeping.module';
import { WeeklyRewardsSplittingModule } from 'src/submodules/weekly-rewards-splitting/weekly-rewards-splitting.module';
import { ElasticSearchModule } from './elastic-search/elastic.search.module';
import { EventsProcessorService } from './crons/events.processor.service';
import { CurrencyConverterCacheWarmerService } from './crons/currency.converter.cache.warmer.service';
import { CurrencyConverterModule } from 'src/modules/currency-converter/currency.converter.module';
import { WeekTimekeepingCacheWarmerService } from './crons/week.timekeeping.cache.warmer.service';
import { WeeklyRewardsSplittingCacheWarmerService } from './crons/weekly.rewards.cache.warmer.service';
import { RouterCacheWarmerService } from './crons/router.cache.warmer.service';

@Module({
    imports: [
        ScheduleModule.forRoot(),
        CommonAppModule,
        PairModule,
        RouterModule,
        MXCommunicationModule,
        ContextModule,
        FarmModule,
        FarmModuleV1_2,
        FarmModuleV1_3,
        FarmModuleV2,
        StakingModule,
        StakingProxyModule,
        MetabondingModule,
        ProxyModule,
        ProxyFarmModule,
        ProxyPairModule,
        AnalyticsModule,
        PriceDiscoveryModule,
        TokenModule,
        AnalyticsServicesModule,
        RemoteConfigModule,
        GovernanceModule,
        DynamicModuleUtils.getCacheModule(),
        EscrowModule,
        FeesCollectorModule,
        WeekTimekeepingModule,
        WeeklyRewardsSplittingModule,
        ElasticSearchModule,
        CurrencyConverterModule,
    ],
    controllers: [],
    providers: [
        CacheWarmerService,
        PairCacheWarmerService,
        FarmCacheWarmerService,
        StakingCacheWarmerService,
        StakingProxyCacheWarmerService,
        MetabondingCacheWarmerService,
        ProxyCacheWarmerService,
        AnalyticsCacheWarmerService,
        AWSQueryCacheWarmerService,
        PriceDiscoveryCacheWarmerService,
        GovernanceCacheWarmerService,
        TransactionProcessorService,
        EventsProcessorService,
        TokensCacheWarmerService,
        EscrowCacheWarmerService,
        FeesCollectorCacheWarmerService,
        CurrencyConverterCacheWarmerService,
        WeekTimekeepingCacheWarmerService,
        WeeklyRewardsSplittingCacheWarmerService,
        RouterCacheWarmerService,
    ],
})
export class CacheWarmerModule {}
