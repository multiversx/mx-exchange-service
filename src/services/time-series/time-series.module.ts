import { DynamicModule, Global, Module, Type } from "@nestjs/common";
import { AWSModule } from "../aws/aws.module";
import { AWSTimestreamQueryService } from "../aws/aws.timestream.query";
import { AWSTimestreamWriteService } from "../aws/aws.timestream.write";
import { DataApiModule } from "../data-api/data-api.module";
import { DataApiQueryService } from "../data-api/data-api.query.service";
import { DataApiWriteService } from "../data-api/data-api.write.service";
import { TimeSeriesQueryInterface } from "./time-series.query.interface";
import { TimeSeriesQueryService } from "./time-series.query.service";
import { TimeSeriesWriteInterface } from "./time-series.write.interface";
import { TimeSeriesWriteService } from "./time-series.write.service";

@Global()
@Module({})
export class TimeSeriesModule {
  static register(): DynamicModule {
    let timeSeriesModule: Type<any>;
    let timeSeriesQueryInterface: Type<TimeSeriesQueryInterface>;
    let timeSeriesWriteInterface: Type<TimeSeriesWriteInterface>;

    const isDataApi = process.env.TIME_SERIES_TYPE === 'data-api';
    if (!isDataApi) {
      timeSeriesModule = DataApiModule;
      timeSeriesQueryInterface = DataApiQueryService;
      timeSeriesWriteInterface = DataApiWriteService;
    } else {
      timeSeriesModule = AWSModule;
      timeSeriesQueryInterface = AWSTimestreamQueryService;
      timeSeriesWriteInterface = AWSTimestreamWriteService;
    }

    return {
      module: TimeSeriesModule,
      imports: [
        timeSeriesModule,
      ],
      providers: [
        {
          provide: 'TimeSeriesQueryInterface',
          useClass: timeSeriesQueryInterface,
        },
        {
          provide: 'TimeSeriesWriteInterface',
          useClass: timeSeriesWriteInterface,
        },
        TimeSeriesQueryService,
        TimeSeriesWriteService,
      ],
      exports: [
        'TimeSeriesQueryInterface',
        'TimeSeriesWriteInterface',
        TimeSeriesQueryService,
        TimeSeriesWriteService
      ],
    };
  }
}
