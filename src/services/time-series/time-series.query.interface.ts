import { HistoricDataModel } from "src/modules/analytics/models/analytics.model";

export interface TimeSeriesQueryInterface {
  getAggregatedValue({ table, series, metric, time }): Promise<string>

  getLatestCompleteValues({ table, series, metric }): Promise<HistoricDataModel[]>
}