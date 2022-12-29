export interface AnalyticsQueryInterface {
  // TODO create interface for input
  getAggregatedValue({ table, series, metric, time }): Promise<string>;
}