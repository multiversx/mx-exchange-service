import { Module } from '@nestjs/common';
import { AWSModule } from 'src/services/aws/aws.module';
import { CachingModule } from 'src/services/caching/cache.module';
import { ContextModule } from 'src/services/context/context.module';
import { ElrondCommunicationModule } from 'src/services/elrond-communication/elrond-communication.module';
import { FarmModule } from '../farm/farm.module';
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
import { AnalyticsTimescaleGetterService } from './services/analytics.timescale.getter.service';
import { AnalyticsTimescaleSetterService } from './services/analytics.timescale.setter.service';

@Module({
    imports: [
        ElrondCommunicationModule,
        AWSModule,
        CachingModule,
        ContextModule,
        RouterModule,
        PairModule,
        FarmModule,
        ProxyModule,
        LockedAssetModule,
        TokenModule,
    ],
    providers: [
        AnalyticsResolver,
        AnalyticsAWSGetterService,
        AnalyticsAWSSetterService,
        AnalyticsGetterService,
        AnalyticsComputeService,
        AnalyticsPairService,
        PairDayDataResolver,
        AnalyticsTimescaleGetterService,
        AnalyticsTimescaleSetterService,
    ],
    exports: [
        AnalyticsAWSGetterService,
        AnalyticsAWSSetterService,
        AnalyticsGetterService,
        AnalyticsComputeService,
    ],
})
export class AnalyticsModule {}
