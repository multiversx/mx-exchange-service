import { Module } from '@nestjs/common';
import { AppModule } from './app.module';
import { MetricsController } from './modules/metrics/metrics.controller';

@Module({
    imports: [AppModule],
    controllers: [MetricsController],
    providers: [],
})
export class PrivateAppModule {}
