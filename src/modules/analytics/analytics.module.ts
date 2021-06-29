import { Module } from '@nestjs/common';
import { CacheManagerModule } from 'src/services/cache-manager/cache-manager.module';
import { ContextModule } from 'src/services/context/context.module';
import { ElrondCommunicationModule } from 'src/services/elrond-communication/elrond-communication.module';
import { TransactionModule } from 'src/services/transactions/transaction.module';
import { FarmModule } from '../farm/farm.module';
import { PairModule } from '../pair/pair.module';
import { AnalyticsResolver } from './analytics.resolver';
import { AnalyticsService } from './analytics.service';

@Module({
    imports: [
        ElrondCommunicationModule,
        CacheManagerModule,
        ContextModule,
        PairModule,
        FarmModule,
        TransactionModule,
    ],
    providers: [AnalyticsService, AnalyticsResolver],
    exports: [AnalyticsService],
})
export class AnalyticsModule {}
