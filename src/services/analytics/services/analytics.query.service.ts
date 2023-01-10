import { Inject, Injectable } from '@nestjs/common';
import { HistoricDataModel } from 'src/modules/analytics/models/analytics.model';
import { MetricsCollector } from 'src/utils/metrics.collector';
import { PerformanceProfiler } from 'src/utils/performance.profiler';
import { AnalyticsQueryInterface } from '../interfaces/analytics.query.interface';

@Injectable()
export class AnalyticsQueryService implements AnalyticsQueryInterface {
  constructor(
    @Inject('AnalyticsQueryInterface')
    private readonly queryInterface: AnalyticsQueryInterface,
  ) { }

  private async execute<T>(method: string, action: Promise<T>): Promise<T> {
    const profiler = new PerformanceProfiler();
    try {
      return await action;
    } finally {
      profiler.stop();
      MetricsCollector.setDataApiQueryDuration(method, profiler.duration);
    }
  }

  async getAggregatedValue(args: { table: any; series: any; metric: any; time: any; }): Promise<string> {
    return await this.execute(
      this.getAggregatedValue.name,
      this.queryInterface.getAggregatedValue(args)
    );
  }

  async getLatestCompleteValues(args: { table: any, series: any, metric: any }): Promise<HistoricDataModel[]> {
    return await this.execute(
      this.getLatestCompleteValues.name,
      this.queryInterface.getLatestCompleteValues(args)
    );
  }

  async getSumCompleteValues(args: { table: any, series: any, metric: any }): Promise<HistoricDataModel[]> {
    return await this.execute(
      this.getSumCompleteValues.name,
      this.queryInterface.getSumCompleteValues(args)
    );
  }

  async getValues24h(args: { table: any, series: any, metric: any }): Promise<HistoricDataModel[]> {
    return await this.execute(
      this.getValues24h.name,
      this.queryInterface.getValues24h(args)
    );
  }

  async getValues24hSum(args: { table: any, series: any, metric: any }): Promise<HistoricDataModel[]> {
    return await this.execute(
      this.getValues24hSum.name,
      this.queryInterface.getValues24hSum(args)
    );
  }

  async getLatestHistoricData(args: { table: any, time: any, series: any, metric: any, start: any }): Promise<HistoricDataModel[]> {
    return await this.execute(
      this.getLatestHistoricData.name,
      this.queryInterface.getLatestHistoricData(args)
    );
  }

  async getLatestBinnedHistoricData(args: { table: any, time: any, series: any, metric: any, bin: any, start: any }): Promise<HistoricDataModel[]> {
    return await this.execute(
      this.getLatestBinnedHistoricData.name,
      this.queryInterface.getLatestBinnedHistoricData(args)
    );
  }
}
