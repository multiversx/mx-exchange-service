import { Module } from '@nestjs/common';
import { AWSModule } from 'src/services/aws/aws.module';
import { CachingModule } from 'src/services/caching/cache.module';
import { ContextModule } from 'src/services/context/context.module';
import { ElrondCommunicationModule } from 'src/services/elrond-communication/elrond-communication.module';
import { FarmModule } from '../farm/farm.module';
import { PairModule } from '../pair/pair.module';
import { RouterModule } from '../router/router.module';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsEventHandlerService } from './services/analytics.event.handler.service';
import { AnalyticsResolver } from './analytics.resolver';
import { AnalyticsService } from './services/analytics.service';
import { AnalyticsComputeService } from './services/analytics.compute.service';
import { AnalyticsGetterService } from './services/analytics.getter.service';
import { AnalyticsPairService } from './services/analytics.pair.service';
import { PairDayDataResolver } from './analytics.pair.resolver';

@Module({
    imports: [
        ElrondCommunicationModule,
        AWSModule,
        CachingModule,
        ContextModule,
        RouterModule,
        PairModule,
        FarmModule,
    ],
    providers: [
        AnalyticsResolver,
        AnalyticsService,
        AnalyticsGetterService,
        AnalyticsComputeService,
        AnalyticsEventHandlerService,
        AnalyticsPairService,
        PairDayDataResolver,
    ],
    exports: [
        AnalyticsService,
        AnalyticsGetterService,
        AnalyticsComputeService,
        AnalyticsEventHandlerService,
    ],
    controllers: [AnalyticsController],
})
export class AnalyticsModule {}
