import { Inject, Injectable } from "@nestjs/common";
import { Records } from "aws-sdk/clients/timestreamwrite";
import { PerformanceProfiler } from "src/utils/performance.profiler";
import { TimeSeriesWriteInterface } from "./time-series.write.interface";

@Injectable()
export class TimeSeriesWriteService implements TimeSeriesWriteInterface {
  constructor(
    @Inject('TimeSeriesWriteInterface')
    private readonly timeSeriesWriteInterface: TimeSeriesWriteInterface,
  ) { }

  private async execute<T>(key: string, action: Promise<T>): Promise<T> {
    const profiler = new PerformanceProfiler();

    try {
      return await action;
    } finally {
      profiler.stop();
      // TODO add metric
      // this.metricsService.setTimeSeriesDuration(key, profiler.duration);
    }
  }

  async ingest({ TableName, data, Time }): Promise<void> {
    return await this.execute('ingest', this.timeSeriesWriteInterface.ingest({ TableName, data, Time }));
  }

  async multiRecordsIngest(TableName: string, Records: Records): Promise<void> {
    return await this.execute('multiRecordsIngest', this.timeSeriesWriteInterface.multiRecordsIngest(TableName, Records));
  }
}
