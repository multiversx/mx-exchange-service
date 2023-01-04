import { AggregateValue, DataApiClient, DataApiQueryBuilder, HistoricalValue, TimeRange, TimeResolution } from '@elrondnetwork/erdjs-data-api-client';
import { Inject, Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import fs from 'fs';
import moment from 'moment';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { dataApiConfig, elrondConfig } from 'src/config';
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

  async getLatestCompleteValues({ series, metric }: AnalyticsQueryArgs): Promise<HistoricDataModel[]> {
    const query = DataApiQueryBuilder
      .createXExchangeAnalyticsQuery()
      .metric(series, metric)
      .withTimeRange(TimeRange.ALL)
      .withTimeResolution(TimeResolution.INTERVAL_DAY)
      .getHistorical(HistoricalValue.last, HistoricalValue.time);

    const rows = await this.dataApiClient.executeHistoricalQuery(query);

    const data = rows.map((row) => new HistoricDataModel({
      timestamp: row.timestamp.toString(),
      value: new BigNumber(row.last ?? '0').toFixed(),
    }));
    return data;
  }

  async getSumCompleteValues({ series, metric }: AnalyticsQueryArgs): Promise<HistoricDataModel[]> {
    const query = DataApiQueryBuilder
      .createXExchangeAnalyticsQuery()
      .metric(series, metric)
      .withTimeRange(TimeRange.ALL)
      .withTimeResolution(TimeResolution.INTERVAL_DAY)
      .getHistorical(HistoricalValue.sum, HistoricalValue.time);

    const rows = await this.dataApiClient.executeHistoricalQuery(query);

    const data = rows.map((row) => new HistoricDataModel({
      timestamp: row.timestamp.toString(),
      value: new BigNumber(row.sum ?? '0').toFixed(),
    }));
    return data;
  }

  async getValues24h({ series, metric }: AnalyticsQueryArgs): Promise<HistoricDataModel[]> {
    const query = DataApiQueryBuilder
      .createXExchangeAnalyticsQuery()
      .metric(series, metric)
      .betweenDates(moment().utc().subtract(1, 'days').toDate(), new Date())
      .withTimeResolution(TimeResolution.INTERVAL_HOUR)
      .getHistorical(HistoricalValue.max, HistoricalValue.time);

    const rows = await this.dataApiClient.executeHistoricalQuery(query);

    const data = rows.map((row) => new HistoricDataModel({
      timestamp: row.timestamp.toString(),
      value: new BigNumber(row.max ?? '0').toFixed(),
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

    const rows = await this.dataApiClient.executeHistoricalQuery(query);

    const data = rows.map((row) => new HistoricDataModel({
      timestamp: row.timestamp.toString(),
      value: new BigNumber(row.max ?? '0').toFixed(),
    }));
    return data;
  }

  async getLatestHistoricData({ time, series, metric, start }: AnalyticsQueryArgs): Promise<HistoricDataModel[]> {
    const startDate = moment.unix(parseInt(start)).utc().format('yyyy-MM-DD HH:mm:ss');
    const endDate = moment.unix(parseInt(time)).utc().format('yyyy-MM-DD HH:mm:ss');

    const query = `query getLatestHistoricData(series: String!, metric: String!, startDate: String!, endDate: String!) {
      ${dataApiConfig.tableName} {
        values(
          series: $series
          key: $metric
          filter: { sort: ASC, start_date: $startDate, end_date: $endDate }
        ) {
          value
          time
        }
      }
    }`;

    const variables = {
      series,
      metric,
      startDate,
      endDate
    }

    const rows = await this.dataApiClient.executeRawQuery({ query, variables });

    // TODO format
    const data = rows.map((row) => new HistoricDataModel({
      timestamp: row.timestamp.toString(),
      value: new BigNumber(row.value ?? '0').toFixed(),
    }));
    return data;
  }

  async getLatestBinnedHistoricData({ time, series, metric, start }: AnalyticsQueryArgs): Promise<HistoricDataModel[]> {
    // TODO handle bin as time resolution

    const query = DataApiQueryBuilder
      .createXExchangeAnalyticsQuery()
      .metric(series, metric)
      .betweenDates(moment.unix(parseInt(start)).utc().toDate(), moment().utc().subtract(time).toDate())
      .withTimeResolution(TimeResolution.INTERVAL_10_MINUTES)
      .fillDataGaps()
      .getHistorical(HistoricalValue.avg, HistoricalValue.time);

    const rows = await this.dataApiClient.executeHistoricalQuery(query);

    const data = rows.map((row) => new HistoricDataModel({
      timestamp: row.timestamp.toString(),
      value: new BigNumber(row.max ?? '0').toFixed(),
    }));
    return data;
  }
}
