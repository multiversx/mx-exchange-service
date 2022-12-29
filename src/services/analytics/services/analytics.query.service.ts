import { Inject, Injectable } from '@nestjs/common';
import { HistoricDataModel } from 'src/modules/analytics/models/analytics.model';
import { AnalyticsQueryInterface } from '../interfaces/analytics.query.interface';

@Injectable()
export class AnalyticsQueryService implements AnalyticsQueryInterface {
  constructor(
    @Inject('AnalyticsQueryInterface')
    private readonly queryInterface: AnalyticsQueryInterface,
  ) { }

  private async execute<T>(action: Promise<T>): Promise<T> {
    // TODO add performance profiler
    return await action;
  }

  async getAggregatedValue(args: { table: any; series: any; metric: any; time: any; }): Promise<string> {
    return await this.execute(this.queryInterface.getAggregatedValue(args));
  }

  async getLatestCompleteValues(args: { table: any, series: any, metric: any }): Promise<HistoricDataModel[]> {
    return await this.execute(this.queryInterface.getLatestCompleteValues(args));
  }

  async getSumCompleteValues(args: { table: any, series: any, metric: any }): Promise<HistoricDataModel[]> {
    return await this.execute(this.queryInterface.getSumCompleteValues(args));
  }

  async getValues24h(args: { table: any, series: any, metric: any }): Promise<HistoricDataModel[]> {
    return await this.execute(this.queryInterface.getValues24h(args));
  }

  async getValues24hSum(args: { table: any, series: any, metric: any }): Promise<HistoricDataModel[]> {
    return await this.execute(this.queryInterface.getValues24hSum(args));
  }

  async getLatestHistoricData(args: { table: any, time: any, series: any, metric: any, start: any }): Promise<HistoricDataModel[]> {
    return await this.execute(this.queryInterface.getLatestHistoricData(args));
  }

  async getLatestBinnedHistoricData(args: { table: any, time: any, series: any, metric: any, bin: any, start: any }): Promise<HistoricDataModel[]> {
    return await this.execute(this.queryInterface.getLatestBinnedHistoricData(args));
  }
}
