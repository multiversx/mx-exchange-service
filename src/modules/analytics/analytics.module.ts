import { Module } from '@nestjs/common';
import { CachingModule } from 'src/services/caching/cache.module';
import { ContextModule } from 'src/services/context/context.module';
import { ElrondCommunicationModule } from 'src/services/elrond-communication/elrond-communication.module';
import { PairModule } from '../pair/pair.module';
import { RouterModule } from '../router/router.module';
import { AnalyticsResolver } from './analytics.resolver';
import { AnalyticsAWSGetterService } from './services/analytics.aws.getter.service';
import { AnalyticsComputeService } from './services/analytics.compute.service';
import { AnalyticsGetterService } from './services/analytics.getter.service';
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
import { FeesCollectorAbiService } from '../fees-collector/services/fees-collector.abi.service';
import { FeesCollectorModule } from '../fees-collector/fees-collector.module';
import { RemoteConfigModule } from '../remote-config/remote-config.module';
import { AnalyticsModule as AnalyticsServicesModule } from 'src/services/analytics/analytics.module';

@Module({
    imports: [
        ElrondCommunicationModule,
        AnalyticsServicesModule.getModule(),
        CachingModule,
        ContextModule,
        RouterModule,
        PairModule,
        FarmModule,
        ProxyModule,
        LockedAssetModule,
        TokenModule,
        EnergyModule,
        StakingModule,
        FeesCollectorModule,
        RemoteConfigModule,
        WeekTimekeepingModule.register(FeesCollectorAbiService),
    ],
    providers: [
        AnalyticsResolver,
        AnalyticsAWSGetterService,
        AnalyticsAWSSetterService,
        AnalyticsGetterService,
        AnalyticsComputeService,
        AnalyticsPairService,
        PairDayDataResolver,
    ],
    exports: [
        AnalyticsAWSGetterService,
        AnalyticsAWSSetterService,
        AnalyticsGetterService,
        AnalyticsComputeService,
    ],
})
export class AnalyticsModule {}
