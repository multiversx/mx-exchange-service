import { Global, Module } from '@nestjs/common';
import { CommonAppModule } from 'src/common.app.module';
import { DataApiModule } from './data-api/data-api.module';
import { AnalyticsQueryService } from './services/analytics.query.service';
import { AnalyticsWriteService } from './services/analytics.write.service';

@Global()
@Module({
    imports: [CommonAppModule, DataApiModule],
    providers: [AnalyticsQueryService, AnalyticsWriteService],
    exports: [AnalyticsQueryService, AnalyticsWriteService],
})
export class AnalyticsModule {}
