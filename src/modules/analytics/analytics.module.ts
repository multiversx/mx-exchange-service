import { forwardRef, Module } from '@nestjs/common';
import { ContextModule } from 'src/services/context/context.module';
import { MXCommunicationModule } from 'src/services/multiversx-communication/mx.communication.module';
import { PairModule } from '../pair/pair.module';
import { RouterModule } from '../router/router.module';
import { AnalyticsResolver } from './analytics.resolver';
import { AnalyticsAWSGetterService } from './services/analytics.aws.getter.service';
import { AnalyticsComputeService } from './services/analytics.compute.service';
import { ProxyModule } from '../proxy/proxy.module';
import { LockedAssetModule } from '../locked-asset-factory/locked-asset.module';
import { AnalyticsPairService } from './services/analytics.pair.service';
import { PairDayDataResolver } from './analytics.pair.resolver';
import { TokenModule } from '../tokens/token.module';
import { AnalyticsAWSSetterService } from './services/analytics.aws.setter.service';
import { FarmModule } from '../farm/farm.module';
import { EnergyModule } from '../energy/energy.module';
import { StakingModule } from '../staking/staking.module';
import { WeekTimekeepingModule } from '../../submodules/week-timekeeping/week-timekeeping.module';
import { FeesCollectorModule } from '../fees-collector/fees-collector.module';
import { RemoteConfigModule } from '../remote-config/remote-config.module';
import { AnalyticsModule as AnalyticsServicesModule } from 'src/services/analytics/analytics.module';
import { WeeklyRewardsSplittingModule } from 'src/submodules/weekly-rewards-splitting/weekly-rewards-splitting.module';
import { AnalyticsSetterService } from './services/analytics.setter.service';
import { ElasticSearchModule } from 'src/services/elastic-search/elastic.search.module';
import { GlobalRewardsService } from './services/global.rewards.service';
import { GlobalRewardsResolver } from './global.rewards.resolver';
import { FarmModuleV2 } from '../farm/v2/farm.v2.module';
import { AnalyticsPairSetterService } from './services/analytics.pair.setter.service';

@Module({
    imports: [
        AnalyticsServicesModule,
        MXCommunicationModule,
        ContextModule,
        forwardRef(() => RouterModule),
        PairModule,
        FarmModule,
        FarmModuleV2,
        ProxyModule,
        LockedAssetModule,
        TokenModule,
        EnergyModule,
        StakingModule,
        FeesCollectorModule,
        RemoteConfigModule,
        WeekTimekeepingModule,
        WeeklyRewardsSplittingModule,
        ElasticSearchModule,
    ],
    providers: [
        AnalyticsResolver,
        AnalyticsAWSGetterService,
        AnalyticsAWSSetterService,
        AnalyticsComputeService,
        AnalyticsSetterService,
        AnalyticsPairService,
        PairDayDataResolver,
        GlobalRewardsService,
        GlobalRewardsResolver,
        AnalyticsPairSetterService,
    ],
    exports: [
        AnalyticsAWSGetterService,
        AnalyticsAWSSetterService,
        AnalyticsComputeService,
        AnalyticsSetterService,
        GlobalRewardsService,
        AnalyticsPairSetterService,
        AnalyticsPairService,
    ],
})
export class AnalyticsModule {}
