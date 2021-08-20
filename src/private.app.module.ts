import { Module } from '@nestjs/common';
import { CommonAppModule } from './common.app.module';
import { MetricsController } from './endpoints/metrics/metrics.controller';
import { MetricsService } from './endpoints/metrics/metrics.service';
import { ElasticService } from './helpers/elastic.service';

@Module({
    imports: [CommonAppModule],
    controllers: [MetricsController],
    providers: [MetricsService, ElasticService],
})
export class PrivateAppModule {}
