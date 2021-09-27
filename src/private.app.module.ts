import { Module } from '@nestjs/common';
import { CommonAppModule } from './common.app.module';
import { MetricsController } from './endpoints/metrics/metrics.controller';
import { MetricsService } from './endpoints/metrics/metrics.service';
import { ElasticService } from './helpers/elastic.service';
import { BattleOfYieldsModule } from './modules/battle-of-yields/battle.of.yields.module';
import { CachingModule } from './services/caching/cache.module';

@Module({
    imports: [CommonAppModule, CachingModule, BattleOfYieldsModule],
    controllers: [MetricsController],
    providers: [MetricsService, ElasticService],
})
export class PrivateAppModule {}
