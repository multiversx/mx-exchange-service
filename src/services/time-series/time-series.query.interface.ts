import { HistoricDataModel } from "src/modules/analytics/models/analytics.model";

export interface TimeSeriesQueryInterface {
  getLatestCompleteValues({ table, series, metric }): Promise<HistoricDataModel[]>
}