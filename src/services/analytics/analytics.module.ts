import { DynamicModule, Global, Module, Type } from "@nestjs/common";
import { ApiConfigService } from "src/helpers/api.config.service";
import { AWSModule } from "./aws/aws.module";
import { AWSTimestreamQueryService } from "./aws/aws.timestream.query";
import { DataApiModule } from "./data-api/data-api.module";
import { DataApiQueryService } from "./data-api/data-api.query.service";
import { AnalyticsQueryInterface } from "./interfaces/analytics.query.interface";
import { AnalyticsQueryService } from "./services/analytics.query.service";
import { AnalyticsWriteService } from "./services/analytics.write.service";

@Global()
@Module({})
export class AnalyticsModule {
  static register(apiConfigService: ApiConfigService): DynamicModule {
    let shouldImportAwsTimestreamModule = false;
    let shouldImportDataApiModule = false;

    // Import write modules
    if (apiConfigService.isAwsTimestreamWriteActive()) {
      shouldImportAwsTimestreamModule = true;
    }
    if (apiConfigService.isDataApiWriteActive()) {
      shouldImportDataApiModule = true;
    }

    // Import query modules
    let analyticsQueryInterface: Type<AnalyticsQueryInterface> = AWSTimestreamQueryService;
    const analyticsReadMode = apiConfigService.getAnalyticsReadMode();
    if (analyticsReadMode === 'data-api') {
      analyticsQueryInterface = DataApiQueryService;
      shouldImportDataApiModule = true;
    } else {
      shouldImportAwsTimestreamModule = true;
    }

    const imports = [];
    if (shouldImportAwsTimestreamModule) {
      imports.push(AWSModule);
    }
    if (shouldImportDataApiModule) {
      imports.push(DataApiModule);
    }

    return {
      module: AnalyticsModule,
      imports: [
        ...imports
      ],
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
