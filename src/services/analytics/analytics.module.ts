import { Global, Module } from '@nestjs/common';
import { CommonAppModule } from 'src/common.app.module';
import { TimescaleDBModule } from './timescaledb/timescaledb.module';
import { AnalyticsQueryService } from './services/analytics.query.service';
import { AnalyticsWriteService } from './services/analytics.write.service';

@Global()
@Module({
    imports: [CommonAppModule, TimescaleDBModule],
    providers: [AnalyticsQueryService, AnalyticsWriteService],
    exports: [AnalyticsQueryService, AnalyticsWriteService],
})
export class AnalyticsModule {}
