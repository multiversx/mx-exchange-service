export interface AnalyticsQueryArgs {
  table: string;
  series: string;
  metric: string;
  time?: string;
  start?: string;
  bin?: string;
}
