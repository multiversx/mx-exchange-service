import { Module } from '@nestjs/common';
import { AWSModule } from 'src/services/aws/aws.module';
import { CachingModule } from 'src/services/caching/cache.module';
import { ContextModule } from 'src/services/context/context.module';
import { ElrondCommunicationModule } from 'src/services/elrond-communication/elrond-communication.module';
import { PairModule } from '../pair/pair.module';
import { RouterModule } from '../router/router.module';
import { ElasticService } from 'src/helpers/elastic.service';
import { LogsProcessorService } from 'src/services/crons/logs.processor.service';
import { AnalyticsReindexService } from './services/analytics.reindex.service';
import { SchedulerRegistry } from '@nestjs/schedule';

@Module({
    imports: [
        ElrondCommunicationModule,
        AWSModule,
        CachingModule,
        ContextModule,
        RouterModule,
        PairModule,
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
