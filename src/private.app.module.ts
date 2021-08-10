import { Module } from '@nestjs/common';
import { CommonAppModule } from './common.app.module';
import { MetricsController } from './endpoints/metrics/metrics.controller';

@Module({
    imports: [CommonAppModule],
    controllers: [MetricsController],
    providers: [],
})
export class PrivateAppModule {}
