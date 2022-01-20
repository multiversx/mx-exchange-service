import { Module } from '@nestjs/common';
import { CommonAppModule } from './common.app.module';
import { MetricsController } from './endpoints/metrics/metrics.controller';
import { MetricsService } from './endpoints/metrics/metrics.service';
import { ElasticService } from './helpers/elastic.service';
import { PairController } from './modules/pair/pair.controller';
import { PairModule } from './modules/pair/pair.module';

@Module({
    imports: [CommonAppModule, PairModule],
    controllers: [MetricsController, PairController],
    providers: [MetricsService, ElasticService],
})
export class PrivateAppModule {}
