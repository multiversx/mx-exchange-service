import { Module } from '@nestjs/common';
import { AWSModule } from 'src/services/aws/aws.module';
import { CachingModule } from 'src/services/caching/cache.module';
import { ContextModule } from 'src/services/context/context.module';
import { ElrondCommunicationModule } from 'src/services/elrond-communication/elrond-communication.module';
import { FarmModule } from '../farm/farm.module';
import { PairModule } from '../pair/pair.module';
import { RouterModule } from '../router/router.module';
import { PriceDiscoveryModule } from '../price-discovery/price.discovery.module';
import { ElasticService } from 'src/helpers/elastic.service';
import { LogsProcessorService } from 'src/services/crons/logs.processor.service';
import { AnalyticsReindexService } from './services/analytics.reindex.service';
import { SchedulerRegistry } from '@nestjs/schedule';
import { ProxyModule } from '../proxy/proxy.module';
import { AnalyticsComputeService } from './services/analytics.compute.service';
import { AnalyticsGetterService } from './services/analytics.getter.service';
import { AnalyticsAWSGetterService } from './services/analytics.service';
import { AnalyticsEventHandlerService } from './services/analytics.event.handler.service';
import { AnalyticsPairService } from './services/analytics.pair.service';

@Module({
    imports: [
        ElrondCommunicationModule,
        AWSModule,
        CachingModule,
        ContextModule,
        RouterModule,
        PairModule,
        //PriceDiscoveryModule,
    ],
    providers: [
        AnalyticsReindexService,
        ElasticService,
        LogsProcessorService,
        SchedulerRegistry,
    ],
    exports: [AnalyticsReindexService],
})
export class AnalyticsReindexModule {}
