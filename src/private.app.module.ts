import { Module } from '@nestjs/common';
import { CommonAppModule } from './common.app.module';
import { MetricsController } from './endpoints/metrics/metrics.controller';
import { MetricsService } from './endpoints/metrics/metrics.service';
import { ElasticService } from './helpers/elastic.service';
import { PairController } from './modules/pair/pair.controller';
import { PairModule } from './modules/pair/pair.module';
import { RemoteConfigController } from './modules/remote-config/remote-config.controller';
import { RemoteConfigModule } from './modules/remote-config/remote-config.module';
import { TokenController } from './modules/tokens/token.controller';
import { TokenModule } from './modules/tokens/token.module';

@Module({
    imports: [CommonAppModule, PairModule, TokenModule, RemoteConfigModule],
    controllers: [
        MetricsController,
        PairController,
        TokenController,
        RemoteConfigController,
    ],
    providers: [MetricsService, ElasticService],
})
export class PrivateAppModule {}
