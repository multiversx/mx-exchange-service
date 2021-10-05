import { Module } from '@nestjs/common';
import { AWSModule } from 'src/services/aws/aws.module';
import { CachingModule } from 'src/services/caching/cache.module';
import { ContextModule } from 'src/services/context/context.module';
import { ElrondCommunicationModule } from 'src/services/elrond-communication/elrond-communication.module';
import { TransactionModule } from 'src/services/transactions/transaction.module';
import { FarmModule } from '../farm/farm.module';
import { PairModule } from '../pair/pair.module';
import { RouterModule } from '../router/router.module';
import { AnalyticsEventHandlerService } from './analytics.event.handler.service';
import { AnalyticsResolver } from './analytics.resolver';
import { AnalyticsService } from './analytics.service';

@Module({
    imports: [
        ElrondCommunicationModule,
        AWSModule,
        CachingModule,
        ContextModule,
        RouterModule,
        PairModule,
        FarmModule,
        TransactionModule,
    ],
    providers: [
        AnalyticsResolver,
        AnalyticsService,
        AnalyticsEventHandlerService,
    ],
    exports: [AnalyticsService, AnalyticsEventHandlerService],
})
export class AnalyticsModule {}
