import { Inject, Injectable } from "@nestjs/common";
import { HistoricDataModel } from "src/modules/analytics/models/analytics.model";
import { PerformanceProfiler } from "src/utils/performance.profiler";
import { TimeSeriesQueryInterface } from "./time-series.query.interface";

@Injectable()
export class TimeSeriesQueryService implements TimeSeriesQueryInterface {
  constructor(
    @Inject('TimeSeriesQueryInterface')
    private readonly timeSeriesQueryInterface: TimeSeriesQueryInterface,
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

  async getLatestCompleteValues({ table, series, metric }): Promise<HistoricDataModel[]> {
    return await this.execute('getLatestCompleteValues', this.timeSeriesQueryInterface.getLatestCompleteValues({ table, series, metric }));
  }
}
