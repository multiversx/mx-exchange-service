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
        AnalyticsEventHandlerService,
    ],
    exports: [AnalyticsService, AnalyticsEventHandlerService],
    controllers: [AnalyticsController],
})
export class AnalyticsModule {}
