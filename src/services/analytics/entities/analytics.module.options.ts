import { AnalyticsQueryMode } from "./analytics.query.mode";

export class AnalyticsModuleOptions {
  writeFlags: {
    awsTimestream: boolean;
    dataApi: boolean;
  };
  queryMode: AnalyticsQueryMode;

  constructor(init?: Partial<AnalyticsModuleOptions>) {
    Object.assign(this, init);
  }
}
