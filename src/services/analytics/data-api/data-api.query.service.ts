import { AggregateValue, DataApiClient, DataApiQueryBuilder } from '@elrondnetwork/erdjs-data-api-client';
import { Inject, Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import fs from 'fs';
import moment from 'moment';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { elrondConfig } from 'src/config';
import { ApiConfigService } from 'src/helpers/api.config.service';
import { HistoricDataModel } from 'src/modules/analytics/models/analytics.model';
import { Logger } from 'winston';
import { AnalyticsQueryArgs } from '../entities/analytics.query.args';
import { AnalyticsQueryInterface } from '../interfaces/analytics.query.interface';

@Injectable()
export class DataApiQueryService implements AnalyticsQueryInterface {
  private readonly dataApiClient: DataApiClient;

  constructor(
    private readonly apiConfigService: ApiConfigService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {
    this.dataApiClient = new DataApiClient({
      host: 'dex-service',
      dataApiUrl: process.env.ELRONDDATAAPI_URL,
      multiversXApiUrl: this.apiConfigService.getApiUrl(),
      proxyTimeout: elrondConfig.proxyTimeout,
      keepAlive: {
        maxSockets: elrondConfig.keepAliveMaxSockets,
        maxFreeSockets: elrondConfig.keepAliveMaxFreeSockets,
        timeout: this.apiConfigService.getKeepAliveTimeoutDownstream(),
        freeSocketTimeout: elrondConfig.keepAliveFreeSocketTimeout,
      },
      signerPrivateKey: fs.readFileSync(this.apiConfigService.getNativeAuthKeyPath()).toString(),
    });
  }

  async getAggregatedValue({ series, metric, time }: AnalyticsQueryArgs): Promise<string> {
    const query = DataApiQueryBuilder
      .createXExchangeAnalyticsQuery()
      .metric(series, metric)
      .betweenDates(moment().utc().subtract(time).toDate(), new Date())
      .getAggregate(AggregateValue.sum);

    const value = await this.dataApiClient.executeAggregateQuery(query);
    return new BigNumber(value?.sum ?? '0').toFixed();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getLatestCompleteValues(args: AnalyticsQueryArgs): Promise<HistoricDataModel[]> {
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
