export class AnalyticsModuleOptions {
  writeFlags: {
    awsTimestream: boolean;
    dataApi: boolean;
  };
  queryMode: 'aws-timestream' | 'data-api';

  constructor(init?: Partial<AnalyticsModuleOptions>) {
    Object.assign(this, init);
  }
}
