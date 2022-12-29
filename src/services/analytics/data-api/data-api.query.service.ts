import { Injectable } from '@nestjs/common';
import { HistoricDataModel } from 'src/modules/analytics/models/analytics.model';
import { AnalyticsQueryInterface } from '../interfaces/analytics.query.interface';

@Injectable()
export class DataApiQueryService implements AnalyticsQueryInterface {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getAggregatedValue(args: { table: any; series: any; metric: any; time: any; }): Promise<string> {
    throw new Error('Method not implemented.');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getLatestCompleteValues(args: { table: any; series: any; metric: any; }): Promise<HistoricDataModel[]> {
    throw new Error('Method not implemented.');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getSumCompleteValues(args: { table: any; series: any; metric: any; }): Promise<HistoricDataModel[]> {
    throw new Error('Method not implemented.');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getValues24h(args: { table: any; series: any; metric: any; }): Promise<HistoricDataModel[]> {
    throw new Error('Method not implemented.');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getValues24hSum(args: { table: any; series: any; metric: any; }): Promise<HistoricDataModel[]> {
    throw new Error('Method not implemented.');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getLatestHistoricData(args: { table: any; time: any; series: any; metric: any; start: any; }): Promise<HistoricDataModel[]> {
    throw new Error('Method not implemented.');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getLatestBinnedHistoricData(args: { table: any; time: any; series: any; metric: any; bin: any; start: any; }): Promise<HistoricDataModel[]> {
    throw new Error('Method not implemented.');
  }
}
