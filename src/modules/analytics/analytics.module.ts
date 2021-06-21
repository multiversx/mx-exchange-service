import { Module } from '@nestjs/common';
import { ContextModule } from 'src/services/context/context.module';
import { ElrondCommunicationModule } from 'src/services/elrond-communication/elrond-communication.module';
import { FarmModule } from '../farm/farm.module';
import { PairModule } from '../pair/pair.module';
import { AnalyticsResolver } from './analytics.resolver';
import { AnalyticsService } from './analytics.service';

@Module({
    imports: [ElrondCommunicationModule, ContextModule, PairModule, FarmModule],
    providers: [AnalyticsService, AnalyticsResolver],
    exports: [AnalyticsService],
})
export class AnalyticsModule {}
