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

@Module({
    imports: [
        ElrondCommunicationModule,
        AWSModule,
        ContextModule,
        RouterModule,
        PairModule,
        FarmModule,
        PriceDiscoveryModule,
        CachingModule,
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
