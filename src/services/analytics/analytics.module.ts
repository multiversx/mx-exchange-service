import { DynamicModule, Global, Module, Type } from "@nestjs/common";
import { ApiConfigService } from "src/helpers/api.config.service";
import { AWSModule } from "../aws/aws.module";
import { AWSTimestreamQueryService } from "../aws/aws.timestream.query";
import { DataApiModule } from "../data-api/data-api.module";
import { DataApiQueryService } from "../data-api/data-api.query.service";
import { AnalyticsQueryInterface } from "./interfaces/analytics.query.interface";
import { AnalyticsQueryService } from "./services/analytics.query.service";
import { AnalyticsWriteService } from "./services/analytics.write.service";

@Global()
@Module({})
export class AnalyticsModule {
  static register(apiConfigService: ApiConfigService): DynamicModule {
    // Import write modules
    const modules = [];
    if (apiConfigService.isAwsTimestreamWriteActive()) {
      modules.push(AWSModule)
    }
    if (apiConfigService.isDataApiWriteActive()) {
      modules.push(DataApiModule)
    }

    // Set query modules
    let analyticsQueryInterface: Type<AnalyticsQueryInterface> = AWSTimestreamQueryService;
    
    const analyticsReadMode = apiConfigService.getAnalyticsReadMode();
    if (analyticsReadMode === 'data-api') {
      analyticsQueryInterface = DataApiQueryService;
    }

    return {
      module: AnalyticsModule,
      imports: modules,
      providers: [
        {
          provide: 'AnalyticsQueryInterface',
          useClass: analyticsQueryInterface,
        },
        AnalyticsQueryService,
        AnalyticsWriteService,
      ],
      exports: [
        'AnalyticsQueryInterface',
        AnalyticsQueryService,
        AnalyticsWriteService
      ],
    };
  }
}
