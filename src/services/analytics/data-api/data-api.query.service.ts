import { AggregateValue, DataApiClient, DataApiQueryBuilder, HistoricalValue, TimeResolution } from '@elrondnetwork/erdjs-data-api-client';
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
    // TODO test 24h 
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
  async getSumCompleteValues({ table, series, metric }: AnalyticsQueryArgs): Promise<HistoricDataModel[]> {
    throw new Error('Method not implemented.');
  }

  async getValues24h({ series, metric }: AnalyticsQueryArgs): Promise<HistoricDataModel[]> {
    const query = DataApiQueryBuilder
      .createXExchangeAnalyticsQuery()
      .metric(series, metric)
      .betweenDates(moment().utc().subtract(1, 'days').toDate(), new Date())
      .withTimeResolution(TimeResolution.INTERVAL_HOUR)
      .getHistorical(HistoricalValue.max, HistoricalValue.time);

    const values = await this.dataApiClient.executeHistoricalQuery(query);

    const data = values.map((value) => new HistoricDataModel({
      timestamp: value.timestamp.toString(),
      value: new BigNumber(value.max ?? '0').toFixed(),
    }));
    return data;
  }

  async getValues24hSum({ series, metric }: AnalyticsQueryArgs): Promise<HistoricDataModel[]> {
    const query = DataApiQueryBuilder
      .createXExchangeAnalyticsQuery()
      .metric(series, metric)
      .betweenDates(moment().utc().subtract(1, 'days').toDate(), new Date())
      .withTimeResolution(TimeResolution.INTERVAL_HOUR)
      .fillDataGaps()
      .getHistorical(HistoricalValue.sum, HistoricalValue.time);

    const values = await this.dataApiClient.executeHistoricalQuery(query);

    const data = values.map((value) => new HistoricDataModel({
      timestamp: value.timestamp.toString(),
      value: new BigNumber(value.max ?? '0').toFixed(),
    }));
    return data;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getLatestHistoricData({ table: any; time: any; series: any; metric: any; start: any; }: AnalyticsQueryArgs): Promise<HistoricDataModel[]> {
    throw new Error('Method not implemented.');
    const query = `query generic_query {
      ${elrondData.timescale.table} {
       values(
         series: "${series}"
         key: "${key}"
         filter: {sort: ASC, start_date: "${startDate}", end_date: "${endDate}"}
       ) {
         value
         time
       }
     }
   }`;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getLatestBinnedHistoricData({ table: any; time: any; series: any; metric: any; bin: any; start: any; }: AnalyticsQueryArgs): Promise<HistoricDataModel[]> {
    throw new Error('Method not implemented.');
    const query = `query generic_query {
      ${elrondData.timescale.table} {
       metric(
         series: "${series}"
         key: "${key}"
         query: {start_date: "${startDate}", end_date: "${endDate}", resolution: ${resolution}}
       ) {
         avg
         time
       }
     }
   }`;
  }
}
