import { Injectable } from '@nestjs/common';
import { HistoricDataModel } from 'src/modules/analytics/models/analytics.model';
import { RemoteConfigGetterService } from 'src/modules/remote-config/remote-config.getter.service';
import { MetricsCollector } from 'src/utils/metrics.collector';
import { PerformanceProfiler } from 'src/utils/performance.profiler';
import { AWSTimestreamQueryService } from '../aws/aws.timestream.query';
import { DataApiQueryService } from '../data-api/data-api.query.service';
import { AnalyticsQueryMode } from '../entities/analytics.query.mode';
import { AnalyticsQueryInterface } from '../interfaces/analytics.query.interface';

@Injectable()
export class AnalyticsQueryService implements AnalyticsQueryInterface {
  constructor(
    private readonly remoteConfigGetterService: RemoteConfigGetterService,
    private readonly awsQuery: AWSTimestreamQueryService,
    private readonly dataApiQuery: DataApiQueryService,
  ) { }

  async getAggregatedValue(args: { table: any; series: any; metric: any; time: any; }): Promise<string> {
    const service = await this.getService();
    return await this.execute(
      this.getAggregatedValue.name,
      service.getAggregatedValue(args)
    );
  }

  async getLatestCompleteValues(args: { table: any, series: any, metric: any }): Promise<HistoricDataModel[]> {
    const service = await this.getService();
    return await this.execute(
      this.getLatestCompleteValues.name,
      service.getLatestCompleteValues(args)
    );
  }

  async getSumCompleteValues(args: { table: any, series: any, metric: any }): Promise<HistoricDataModel[]> {
    const service = await this.getService();
    return await this.execute(
      this.getSumCompleteValues.name,
      service.getSumCompleteValues(args)
    );
  }

  async getValues24h(args: { table: any, series: any, metric: any }): Promise<HistoricDataModel[]> {
    const service = await this.getService();
    return await this.execute(
      this.getValues24h.name,
      service.getValues24h(args)
    );
  }

  async getValues24hSum(args: { table: any, series: any, metric: any }): Promise<HistoricDataModel[]> {
    const service = await this.getService();
    return await this.execute(
      this.getValues24hSum.name,
      service.getValues24hSum(args)
    );
  }

  async getLatestHistoricData(args: { table: any, time: any, series: any, metric: any, start: any }): Promise<HistoricDataModel[]> {
    const service = await this.getService();
    return await this.execute(
      this.getLatestHistoricData.name,
      service.getLatestHistoricData(args)
    );
  }

  async getLatestBinnedHistoricData(args: { table: any, time: any, series: any, metric: any, bin: any, start: any }): Promise<HistoricDataModel[]> {
    const service = await this.getService();
    return await this.execute(
      this.getLatestBinnedHistoricData.name,
      service.getLatestBinnedHistoricData(args)
    );
  }

  private async execute<T>(method: string, action: Promise<T>): Promise<T> {
    const profiler = new PerformanceProfiler();
    try {
      return await action;
    } finally {
      profiler.stop();
      MetricsCollector.setDataApiQueryDuration(method, profiler.duration);
    }
  }

  private async getService(): Promise<AnalyticsQueryInterface> {
    const queryMode = await this.remoteConfigGetterService.getAnalyticsQueryMode();

    if (queryMode === AnalyticsQueryMode.AWS_TIMESTREAM) {
      return this.awsQuery;
    }
    return this.dataApiQuery;
  }
}
