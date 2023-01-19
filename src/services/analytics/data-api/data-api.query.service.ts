import { AggregateValue, DataApiClient, DataApiQueryBuilder, HistoricalValue, TimeRange, TimeResolution } from '@multiversx/sdk-data-api-client';
import { Inject, Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import fs from 'fs';
import moment from 'moment';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { dataApiConfig, elrondConfig } from 'src/config';
import { ApiConfigService } from 'src/helpers/api.config.service';
import { HistoricDataModel } from 'src/modules/analytics/models/analytics.model';
import { CachingService } from 'src/services/caching/cache.service';
import { computeIntervalValues, computeTimeInterval, convertBinToTimeResolution, convertDataApiHistoricalResponseToHash, DataApiQuery, generateCacheKeysForTimeInterval } from 'src/utils/analytics.utils';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { Logger } from 'winston';
import { AnalyticsQueryArgs } from '../entities/analytics.query.args';
import { AnalyticsQueryInterface } from '../interfaces/analytics.query.interface';

@Injectable()
export class DataApiQueryService implements AnalyticsQueryInterface {
  private readonly dataApiClient: DataApiClient;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly apiConfigService: ApiConfigService,
    private readonly cachingService: CachingService,
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

  @DataApiQuery()
  async getAggregatedValue({ series, metric, time }: AnalyticsQueryArgs): Promise<string> {
    const [startDate, endDate] = computeTimeInterval(time);

    const query = DataApiQueryBuilder
      .createXExchangeAnalyticsQuery()
      .metric(series, metric)
      .betweenDates(startDate, endDate)
      .getAggregate(AggregateValue.sum);

    const data = await this.dataApiClient.executeAggregateQuery(query);

    const value = new BigNumber(data?.sum ?? '0').toFixed();
    return value;
  }

  @DataApiQuery()
  async getLatestCompleteValues({ series, metric }: AnalyticsQueryArgs): Promise<HistoricDataModel[]> {
    const completeValues = await this.getCompleteValues(series, metric);

    const latestCompleteValues = completeValues.map((value) => HistoricDataModel.fromCompleteValues(value, 'last'));
    return latestCompleteValues;
  }

  @DataApiQuery()
  async getSumCompleteValues({ series, metric }: AnalyticsQueryArgs): Promise<HistoricDataModel[]> {
    const completeValues = await this.getCompleteValues(series, metric);

    const sumCompleteValues = completeValues.map((value) => HistoricDataModel.fromCompleteValues(value, 'sum'));
    return sumCompleteValues;
  }

  @DataApiQuery()
  async getValues24h({ series, metric }: AnalyticsQueryArgs): Promise<HistoricDataModel[]> {
    const query = DataApiQueryBuilder
      .createXExchangeAnalyticsQuery()
      .metric(series, metric)
      .withTimeRange(TimeRange.DAY)
      .withTimeResolution(TimeResolution.INTERVAL_HOUR)
      .getHistorical(HistoricalValue.last, HistoricalValue.time);

    const rows = await this.dataApiClient.executeHistoricalQuery(query);

    const data = rows.map((row) => HistoricDataModel.fromDataApiResponse(row, HistoricalValue.last));
    return data;
  }

  @DataApiQuery()
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

  @DataApiQuery()
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
    const rows = response.xExchangeAnalytics.values

    const data = rows.map((row: any) => new HistoricDataModel({
      timestamp: moment.utc(row.time).unix().toString(),
      value: new BigNumber(row.value ?? '0').toFixed(),
    }));
    return data;
  }

  @DataApiQuery()
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

  private async getCompleteValues(series: string, metric: string): Promise<any[]> {
    const hashCacheKey = generateCacheKeyFromParams('timeseries', series, metric);

    // TODO get first date;
    const startDate = moment.utc('2021-11-15').startOf('day'); // dex launch date
    const endDate = moment.utc();

    const completeValues = [];
    for (let date = startDate.clone(); date.isSameOrBefore(endDate); date.add(1, 'month')) {
      const intervalStart = date.clone();
      const intervalEnd = moment.min(date.clone().add(1, 'month').subtract(1, 's'), endDate);

      console.log(intervalStart.format('YYYY-MM-DD HH:mm'), intervalEnd.format('YYYY-MM-DD HH:mm'));

      const keys = generateCacheKeysForTimeInterval(intervalStart, intervalEnd);

      const values = await this.cachingService.getMultipleFromHash(hashCacheKey, keys);
      let intervalValues = computeIntervalValues(keys, values);

      if (values.some(value => value === null)) {
        const dates = [intervalStart.utc(false).toDate(), intervalEnd.utc(false).toDate()]
        const rows = await this.getCompleteValuesInInterval(series, metric, dates[0], dates[1])

        const toBeInserted = convertDataApiHistoricalResponseToHash(rows);

        if (toBeInserted.length > 0) {
          const redisValues = toBeInserted.map(({ field, value }) => [field, JSON.stringify(value)]) as [string, string][];
          await this.cachingService.setMultipleInHash(hashCacheKey, redisValues);
        }

        intervalValues = toBeInserted;
      }

      completeValues.push(...intervalValues)
    }

    // handle current time
    const currentRows = await this.getCompleteValuesInInterval(series, metric, moment.utc().startOf('day').toDate(), moment.utc().toDate());
    const currentValues = convertDataApiHistoricalResponseToHash(currentRows);
    completeValues.push(...currentValues)

    return completeValues;
  }

  @DataApiQuery()
  private async getCompleteValuesInInterval(series: string, metric: string, intervalStart: Date, intervalEnd: Date): Promise<any[]> {
    const query = DataApiQueryBuilder
      .createXExchangeAnalyticsQuery()
      .metric(series, metric)
      .betweenDates(intervalStart, intervalEnd)
      .withTimeResolution(TimeResolution.INTERVAL_DAY)
      .fillDataGaps({ skipFirstNullValues: true })
      .getHistorical(HistoricalValue.last, HistoricalValue.sum, HistoricalValue.time);

    const rows = await this.dataApiClient.executeHistoricalQuery(query);
    return rows;
  }
}
