import { DynamicModule, Global, Module, Type } from "@nestjs/common";
import { CommonAppModule } from "src/common.app.module";
import { ApiConfigService } from "src/helpers/api.config.service";
import { AWSModule } from "./aws/aws.module";
import { AWSTimestreamQueryService } from "./aws/aws.timestream.query";
import { DataApiModule } from "./data-api/data-api.module";
import { DataApiQueryService } from "./data-api/data-api.query.service";
import { AnalyticsModuleOptions } from "./entities/analytics.module.options";
import { AnalyticsQueryMode } from "./entities/analytics.query.mode";
import { AnalyticsQueryInterface } from "./interfaces/analytics.query.interface";
import { AnalyticsQueryService } from "./services/analytics.query.service";
import { AnalyticsWriteService } from "./services/analytics.write.service";

@Global()
@Module({})
export class AnalyticsModule {
  static getModule(): DynamicModule {
    return AnalyticsModule.forRoot({
      writeFlags: {
        awsTimestream: ApiConfigService.isAwsTimestreamWriteActive(),
        dataApi: ApiConfigService.isDataApiWriteActive(),
      },
      queryMode: ApiConfigService.getAnalyticsQueryMode(),
    });
  }

  static forRoot(options: AnalyticsModuleOptions): DynamicModule {
    let shouldImportAwsTimestreamModule = options.writeFlags.awsTimestream;
    let shouldImportDataApiModule = options.writeFlags.dataApi;

    let analyticsQueryInterface: Type<AnalyticsQueryInterface> = AWSTimestreamQueryService;
    if (options.queryMode === AnalyticsQueryMode.DATA_API) {
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
        CommonAppModule,
        ...imports
      ],
      providers: [
        {
          provide: AnalyticsModuleOptions,
          useFactory: () => options,
        },
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
