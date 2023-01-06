import { AggregateValue, DataApiClient, DataApiQueryBuilder, HistoricalValue, TimeRange, TimeResolution } from '@elrondnetwork/erdjs-data-api-client';
import { Inject, Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import fs from 'fs';
import moment from 'moment';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { dataApiConfig, elrondConfig } from 'src/config';
import { ApiConfigService } from 'src/helpers/api.config.service';
import { HistoricDataModel } from 'src/modules/analytics/models/analytics.model';
import { computeTimeInterval, convertBinToTimeResolution } from 'src/utils/analytics.utils';
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
    const [startDate, endDate] = computeTimeInterval(time);

    const query = DataApiQueryBuilder
      .createXExchangeAnalyticsQuery()
      .metric(series, metric)
      .betweenDates(startDate, endDate)
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

    const data = rows.map((row) => HistoricDataModel.fromDataApiResponse(row, HistoricalValue.last));
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

    const data = rows.map((row) => HistoricDataModel.fromDataApiResponse(row, HistoricalValue.sum));
    return data;
  }

  async getValues24h({ series, metric }: AnalyticsQueryArgs): Promise<HistoricDataModel[]> {
    const query = DataApiQueryBuilder
      .createXExchangeAnalyticsQuery()
      .metric(series, metric)
      .withTimeRange(TimeRange.DAY)
      .withTimeResolution(TimeResolution.INTERVAL_HOUR)
      .getHistorical(HistoricalValue.max, HistoricalValue.time);

    const rows = await this.dataApiClient.executeHistoricalQuery(query);

    const data = rows.map((row) => HistoricDataModel.fromDataApiResponse(row, HistoricalValue.max));
    return data;
  }

  async getValues24hSum({ series, metric }: AnalyticsQueryArgs): Promise<HistoricDataModel[]> {
    const query = DataApiQueryBuilder
      .createXExchangeAnalyticsQuery()
      .metric(series, metric)
      .withTimeRange(TimeRange.DAY)
      .withTimeResolution(TimeResolution.INTERVAL_HOUR)
      .fillDataGaps()
      .getHistorical(HistoricalValue.sum, HistoricalValue.time);

    const rows = await this.dataApiClient.executeHistoricalQuery(query);

    const data = rows.map((row) => HistoricDataModel.fromDataApiResponse(row, HistoricalValue.sum));
    return data;
  }

  async getLatestHistoricData({ time, series, metric, start }: AnalyticsQueryArgs): Promise<HistoricDataModel[]> {
    const [startDate, endDate] = computeTimeInterval(time, start);

    const query = `query getLatestHistoricData($series: String!, $metric: String!, $startDate: DateTime!, $endDate: DateTime!) {
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
      startDate: moment.utc(startDate).format('YYYY-MM-DD HH:mm:ss'),
      endDate: moment.utc(endDate).format('YYYY-MM-DD HH:mm:ss'),
    }

    const response = await this.dataApiClient.executeRawQuery({ query, variables });
    const rows = response.maiar_exchange_analytics.values

    const data = rows.map((row: any) => new HistoricDataModel({
      timestamp: moment.utc(row.time).unix().toString(),
      value: new BigNumber(row.value ?? '0').toFixed(),
    }));
    return data;
  }

  async getLatestBinnedHistoricData({ time, series, metric, start, bin }: AnalyticsQueryArgs): Promise<HistoricDataModel[]> {
    const [startDate, endDate] = computeTimeInterval(time, start);
    const timeResolution = convertBinToTimeResolution(bin);

    const query = DataApiQueryBuilder
      .createXExchangeAnalyticsQuery()
      .metric(series, metric)
      .betweenDates(startDate, endDate)
      .withTimeResolution(timeResolution)
      .fillDataGaps()
      .getHistorical(HistoricalValue.avg, HistoricalValue.time);

    const rows = await this.dataApiClient.executeHistoricalQuery(query);

    const data = rows.map((row) => HistoricDataModel.fromDataApiResponse(row, HistoricalValue.max));
    return data;
  }
}
