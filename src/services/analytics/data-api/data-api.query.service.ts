import { Injectable } from '@nestjs/common';
import { AnalyticsQueryInterface } from '../interfaces/analytics.query.interface';

@Injectable()
export class DataApiQueryService implements AnalyticsQueryInterface {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getAggregatedValue({ table, series, metric, time }): Promise<string> {
    throw new Error('Method not implemented.');
  }
}
