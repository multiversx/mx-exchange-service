import { HistoricDataModel } from "src/modules/analytics/models/analytics.model";

export interface AnalyticsQueryInterface {
  getAggregatedValue({ table, series, metric, time }): Promise<string>;

  getLatestCompleteValues({ table, series, metric }): Promise<HistoricDataModel[]>;

  getSumCompleteValues({ table, series, metric }): Promise<HistoricDataModel[]>;

  getValues24h({ table, series, metric }): Promise<HistoricDataModel[]>;

  getValues24hSum({ table, series, metric }): Promise<HistoricDataModel[]>;

  getLatestHistoricData({ table, time, series, metric, start }): Promise<HistoricDataModel[]>;

  getLatestBinnedHistoricData({ table, time, series, metric, bin, start }): Promise<HistoricDataModel[]>;
}