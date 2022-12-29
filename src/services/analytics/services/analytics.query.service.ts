import { Inject, Injectable } from '@nestjs/common';
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
}
