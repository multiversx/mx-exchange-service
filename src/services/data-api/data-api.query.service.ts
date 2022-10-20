import { Injectable } from "@nestjs/common";
import { HistoricDataModel } from "src/modules/analytics/models/analytics.model";
import { TimeSeriesQueryInterface } from "../time-series/time-series.query.interface";

@Injectable()
export class DataApiQueryService implements TimeSeriesQueryInterface {
  getAggregatedValue({ table, series, metric, time }): Promise<string> {
    throw new Error("Method not implemented.");
  }

  getLatestCompleteValues({ table, series, metric }): Promise<HistoricDataModel[]> {
    throw new Error("Method not implemented.");
  }
}