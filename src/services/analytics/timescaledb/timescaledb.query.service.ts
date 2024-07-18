import { Inject, Injectable, Logger } from '@nestjs/common';
import moment from 'moment';
import {
    CandleDataModel,
    HistoricDataModel,
    OhlcvDataModel,
} from 'src/modules/analytics/models/analytics.model';
import { computeTimeInterval, decodeTime } from 'src/utils/analytics.utils';
import { AnalyticsQueryArgs } from '../entities/analytics.query.args';
import { AnalyticsQueryInterface } from '../interfaces/analytics.query.interface';
import {
    CloseDaily,
    CloseHourly,
    PDCloseMinute,
    PriceCandleHourly,
    PriceCandleMinute,
    PriceCandleDaily,
    SumDaily,
    SumHourly,
    TokenBurnedWeekly,
    XExchangeAnalyticsEntity,
    TokenCandlesMinute,
    TokenCandlesHourly,
    TokenCandlesDaily,
    PairFirstTokenCandlesMinute,
    PairFirstTokenCandlesHourly,
    PairFirstTokenCandlesDaily,
    PairSecondTokenCandlesMinute,
    PairSecondTokenCandlesHourly,
    PairSecondTokenCandlesDaily,
} from './entities/timescaledb.entities';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { TimescaleDBQuery } from 'src/helpers/decorators/timescaledb.query.decorator';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { CacheService } from '@multiversx/sdk-nestjs-cache';
import { Constants } from '@multiversx/sdk-nestjs-common';
import { PriceCandlesResolutions } from 'src/modules/analytics/models/query.args';
import { PerformanceProfiler } from '@multiversx/sdk-nestjs-monitoring';
import { MetricsCollector } from 'src/utils/metrics.collector';

@Injectable()
export class TimescaleDBQueryService implements AnalyticsQueryInterface {
    constructor(
        @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
        private readonly cacheService: CacheService,
        @InjectRepository(XExchangeAnalyticsEntity)
        private readonly dexAnalytics: Repository<XExchangeAnalyticsEntity>,
        @InjectRepository(SumDaily)
        private readonly sumDaily: Repository<SumDaily>,
        @InjectRepository(SumHourly)
        private readonly sumHourly: Repository<SumHourly>,
        @InjectRepository(CloseDaily)
        private readonly closeDaily: Repository<CloseDaily>,
        @InjectRepository(CloseHourly)
        private readonly closeHourly: Repository<CloseHourly>,
        @InjectRepository(TokenBurnedWeekly)
        private readonly tokenBurnedWeekly: Repository<TokenBurnedWeekly>,
        @InjectRepository(PDCloseMinute)
        private readonly pdCloseMinute: Repository<PDCloseMinute>,
        @InjectRepository(PriceCandleMinute)
        private readonly priceCandleMinute: Repository<PriceCandleMinute>,
        @InjectRepository(PriceCandleHourly)
        private readonly priceCandleHourly: Repository<PriceCandleHourly>,
        @InjectRepository(PriceCandleDaily)
        private readonly priceCandleDaily: Repository<PriceCandleDaily>,
        @InjectRepository(TokenCandlesMinute)
        private readonly tokenCandlesMinute: Repository<TokenCandlesMinute>,
        @InjectRepository(TokenCandlesHourly)
        private readonly tokenCandlesHourly: Repository<TokenCandlesHourly>,
        @InjectRepository(TokenCandlesDaily)
        private readonly tokenCandlesDaily: Repository<TokenCandlesDaily>,
        @InjectRepository(PairFirstTokenCandlesMinute)
        private readonly pairFirstTokenCandlesMinute: Repository<PairFirstTokenCandlesMinute>,
        @InjectRepository(PairFirstTokenCandlesHourly)
        private readonly pairFirstTokenCandlesHourly: Repository<PairFirstTokenCandlesHourly>,
        @InjectRepository(PairFirstTokenCandlesDaily)
        private readonly pairFirstTokenCandlesDaily: Repository<PairFirstTokenCandlesDaily>,
        @InjectRepository(PairSecondTokenCandlesMinute)
        private readonly pairSecondTokenCandlesMinute: Repository<PairSecondTokenCandlesMinute>,
        @InjectRepository(PairSecondTokenCandlesHourly)
        private readonly pairSecondTokenCandlesHourly: Repository<PairSecondTokenCandlesHourly>,
        @InjectRepository(PairSecondTokenCandlesDaily)
        private readonly pairSecondTokenCandlesDaily: Repository<PairSecondTokenCandlesDaily>,
    ) {}

    @TimescaleDBQuery()
    async getAggregatedValue({
        series,
        metric,
        time,
    }: AnalyticsQueryArgs): Promise<string> {
        const [startDate, endDate] = computeTimeInterval(time);

        if (metric.includes('Burned')) {
            const query = await this.tokenBurnedWeekly
                .createQueryBuilder()
                .select('sum(sum) as sum')
                .where('series = :series', { series })
                .andWhere('key = :metric', { metric })
                .andWhere('time between :start and :end', {
                    start: startDate,
                    end: endDate,
                })
                .getRawOne();
            return query.sum ?? '0';
        }

        const query = await this.dexAnalytics
            .createQueryBuilder()
            .select('sum(value)')
            .where('series = :series', { series })
            .andWhere('key = :key', { key: metric })
            .andWhere('timestamp between :start and :end', {
                start: startDate,
                end: endDate,
            })
            .getRawOne();

        return query?.sum ?? '0';
    }

    @TimescaleDBQuery()
    async getLatestCompleteValues({
        series,
        metric,
        start,
        time,
    }: AnalyticsQueryArgs): Promise<HistoricDataModel[]> {
        try {
            let startDate, endDate;

            if (time) {
                [startDate, endDate] = computeTimeInterval(time, start);
            } else {
                endDate = moment().utc().toDate();
                startDate = start
                    ? moment.unix(parseInt(start)).utc().toDate()
                    : await this.getStartDate(series);
            }

            if (!time && !startDate) {
                return [];
            }

            const previousValue = this.closeDaily
                .createQueryBuilder()
                .select('last')
                .where('series = :series', { series })
                .andWhere('key = :metric', { metric })
                .andWhere('time < :startDate', { startDate })
                .orderBy('time', 'DESC')
                .limit(1);

            const query = await this.closeDaily
                .createQueryBuilder()
                .select("time_bucket_gapfill('1 day', time) as day")
                .addSelect(
                    `locf(last(last, time) ${
                        start || time ? `, (${previousValue.getQuery()})` : ''
                    }) as last`,
                )
                .where('series = :series', { series })
                .andWhere('key = :metric', { metric })
                .andWhere('time between :startDate and :endDate', {
                    startDate,
                    endDate,
                })
                .groupBy('day')
                .getRawMany();

            return (
                query?.map(
                    (row) =>
                        new HistoricDataModel({
                            timestamp: moment
                                .utc(row.day)
                                .format('yyyy-MM-DD HH:mm:ss'),
                            value: row.last ?? '0',
                        }),
                ) ?? []
            );
        } catch (error) {
            this.logger.error('getLatestCompleteValues', {
                series,
                metric,
                start,
                time,
                error,
            });
            return [];
        }
    }

    private createDayHistoricDataModel(
        row: any,
        fallbackValue: string,
    ): HistoricDataModel {
        return new HistoricDataModel({
            timestamp: moment.utc(row.day).format('yyyy-MM-DD HH:mm:ss'),
            value: row.last ?? fallbackValue,
        });
    }

    @TimescaleDBQuery()
    async getSumCompleteValues({
        series,
        metric,
    }: AnalyticsQueryArgs): Promise<HistoricDataModel[]> {
        try {
            const startDate = await this.getStartDate(series);

            if (!startDate) {
                return [];
            }

            const seriesWhere = series.includes('%')
                ? 'series LIKE :series'
                : 'series = :series';

            const query = await this.sumDaily
                .createQueryBuilder()
                .select("time_bucket_gapfill('1 day', time) as day")
                .addSelect('sum(sum) as sum')
                .where(seriesWhere, { series })
                .andWhere('key = :metric', { metric })
                .andWhere('time between :start and now()', {
                    start: startDate,
                })
                .groupBy('day')
                .getRawMany();
            return (
                query?.map(
                    (row) =>
                        new HistoricDataModel({
                            timestamp: moment
                                .utc(row.day)
                                .format('yyyy-MM-DD HH:mm:ss'),
                            value: row.sum ?? '0',
                        }),
                ) ?? []
            );
        } catch (error) {
            this.logger.error('getSumCompleteValues', {
                series,
                metric,
                error,
            });
            return [];
        }
    }

    @TimescaleDBQuery()
    async getValues24h({
        series,
        metric,
    }: AnalyticsQueryArgs): Promise<HistoricDataModel[]> {
        try {
            const previousValue = this.closeHourly
                .createQueryBuilder()
                .select('last')
                .where('series = :series', { series })
                .andWhere('key = :metric', { metric })
                .andWhere("time < now() - INTERVAL '1 day'")
                .orderBy('time', 'DESC')
                .limit(1);

            const query = await this.closeHourly
                .createQueryBuilder()
                .select("time_bucket_gapfill('1 hour', time) as hour")
                .addSelect(
                    `locf(last(last, time), (${previousValue.getQuery()})) as last`,
                )
                .where('series = :series', { series })
                .andWhere('key = :metric', { metric })
                .andWhere("time between now() - INTERVAL '1 day' and now()")
                .groupBy('hour')
                .getRawMany();

            return (
                query?.map(
                    (row) =>
                        new HistoricDataModel({
                            timestamp: moment
                                .utc(row.hour)
                                .format('yyyy-MM-DD HH:mm:ss'),
                            value: row.last ?? '0',
                        }),
                ) ?? []
            );
        } catch (error) {
            this.logger.error(
                `getValues24h: Error getting query for ${series} ${metric}`,
            );
            return [];
        }
    }

    @TimescaleDBQuery()
    async getValues24hSum({
        series,
        metric,
    }: AnalyticsQueryArgs): Promise<HistoricDataModel[]> {
        try {
            const seriesWhere = series.includes('%')
                ? 'series LIKE :series'
                : 'series = :series';

            const query = await this.sumHourly
                .createQueryBuilder()
                .select("time_bucket_gapfill('1 hour', time) as hour")
                .addSelect('sum(sum) as sum')
                .where(seriesWhere, { series })
                .andWhere('key = :metric', { metric })
                .andWhere("time between now() - INTERVAL '1 day' and now()")
                .groupBy('hour')
                .getRawMany();
            return (
                query?.map(
                    (row) =>
                        new HistoricDataModel({
                            timestamp: moment
                                .utc(row.hour)
                                .format('yyyy-MM-DD HH:mm:ss'),
                            value: row.sum ?? '0',
                        }),
                ) ?? []
            );
        } catch (error) {
            this.logger.error(
                `getValues24hSum: Error getting query for ${series} ${metric}`,
            );
            return [];
        }
    }

    @TimescaleDBQuery()
    async getHourlySumValues({
        series,
        metric,
        start,
        time,
    }: AnalyticsQueryArgs): Promise<HistoricDataModel[]> {
        try {
            let startDate, endDate;

            const seriesWhere = series.includes('%')
                ? 'series LIKE :series'
                : 'series = :series';

            if (time) {
                [startDate, endDate] = computeTimeInterval(time, start);
            } else {
                endDate = moment().utc().toDate();
                startDate = start
                    ? moment.unix(parseInt(start)).utc().toDate()
                    : await this.getStartDate(series);
            }

            if (!time && !startDate) {
                return [];
            }

            const query = await this.sumHourly
                .createQueryBuilder()
                .select("time_bucket_gapfill('1 hour', time) as hour")
                .addSelect('sum(sum) as sum')
                .where(seriesWhere, { series })
                .andWhere('key = :metric', { metric })
                .andWhere('time between :start and :end', {
                    start: startDate,
                    end: endDate,
                })
                .groupBy('hour')
                .getRawMany();
            return (
                query?.map(
                    (row) =>
                        new HistoricDataModel({
                            timestamp: moment
                                .utc(row.hour)
                                .format('yyyy-MM-DD HH:mm:ss'),
                            value: row.sum ?? '0',
                        }),
                ) ?? []
            );
        } catch (error) {
            this.logger.error(
                `getHourlySumValues: Error getting query for ${series} ${metric}`,
            );
            return [];
        }
    }

    @TimescaleDBQuery()
    async getPDlatestValue({
        series,
        metric,
    }: AnalyticsQueryArgs): Promise<HistoricDataModel> {
        const query = await this.pdCloseMinute
            .createQueryBuilder()
            .select('time')
            .addSelect('last')
            .where('series = :series', { series })
            .andWhere('key = :metric', { metric })
            .orderBy('time', 'DESC')
            .limit(1)
            .getRawOne();

        return query
            ? new HistoricDataModel({
                  value: query.last,
                  timestamp: query.time,
              })
            : undefined;
    }

    @TimescaleDBQuery()
    async getPDCloseValues({
        series,
        metric,
        timeBucket,
        startDate,
        endDate,
    }): Promise<HistoricDataModel[]> {
        const query = await this.pdCloseMinute
            .createQueryBuilder()
            .select(`time_bucket_gapfill('${timeBucket}', time) as bucket`)
            .addSelect('locf(last(last, time)) as last')
            .where('series = :series', { series })
            .andWhere('key = :metric', { metric })
            .andWhere('time between :start and :end', {
                start: startDate,
                end: endDate,
            })
            .groupBy('bucket')
            .getRawMany();

        const rows = query?.filter((row) => row.last !== null);
        return rows.map(
            (row) =>
                new HistoricDataModel({
                    timestamp: row.bucket,
                    value: row.last,
                }),
        );
    }

    private async getStartDate(series: string): Promise<string | undefined> {
        const cacheKey = `startDate.${series}`;
        const cachedValue = await this.cacheService.get<string>(cacheKey);
        if (cachedValue !== undefined) {
            return cachedValue;
        }

        const seriesWhere = series.includes('%')
            ? 'series LIKE :series'
            : 'series = :series';

        const firstRow = await this.dexAnalytics
            .createQueryBuilder()
            .select('timestamp')
            .where(seriesWhere, { series })
            .orderBy('timestamp', 'ASC')
            .limit(1)
            .getRawOne();

        if (firstRow) {
            await this.cacheService.set(
                cacheKey,
                firstRow.timestamp,
                Constants.oneMinute() * 30,
                Constants.oneMinute() * 20,
            );
        } else {
            await this.cacheService.set(
                cacheKey,
                null,
                Constants.oneMinute() * 10,
                Constants.oneMinute() * 7,
            );
        }

        return firstRow?.timestamp;
    }

    @TimescaleDBQuery()
    async getPriceCandles({
        series,
        metric,
        resolution,
        start,
        end,
    }): Promise<CandleDataModel[]> {
        const candleRepository = this.getCandleModelByResolution(resolution);

        const startDate = moment.unix(start).utc().toString();
        const endDate = moment.unix(end).utc().toString();

        const query = await candleRepository
            .createQueryBuilder()
            .select(`time_bucket_gapfill('${resolution}', time) as bucket`)
            .addSelect('locf(first(open, time)) as open')
            .addSelect('locf(last(close, time)) as close')
            .addSelect('locf(min(low)) as low')
            .addSelect('locf(max(high)) as high')
            .where('series = :series', { series })
            .andWhere('key = :metric', { metric })
            .andWhere('time between :startDate and :endDate', {
                startDate,
                endDate,
            })
            .groupBy('bucket')
            .getRawMany();

        if (!query) {
            return [];
        }

        const needsGapFilling = query.some((row) => !row.open);

        if (!needsGapFilling) {
            return query.map(
                (row) =>
                    new CandleDataModel({
                        time: row.bucket,
                        ohlc: [row.open, row.high, row.low, row.close],
                    }),
            );
        }

        const previousCandle = await candleRepository
            .createQueryBuilder()
            .select('open, close, high, low')
            .where('series = :series', { series })
            .andWhere('key = :metric', { metric })
            .andWhere('time < :startDate', { startDate })
            .orderBy('time', 'DESC')
            .limit(1)
            .getRawOne();

        if (!previousCandle) {
            return query
                .filter((row) => row.open)
                .map(
                    (row) =>
                        new CandleDataModel({
                            time: row.bucket,
                            ohlc: [row.open, row.high, row.low, row.close],
                        }),
                );
        }

        return query.map(
            (row) =>
                new CandleDataModel({
                    time: row.bucket,
                    ohlc: [
                        row.open ?? previousCandle.open,
                        row.high ?? previousCandle.high,
                        row.low ?? previousCandle.low,
                        row.close ?? previousCandle.close,
                    ],
                }),
        );
    }

    @TimescaleDBQuery()
    async getCandles({
        series,
        metric,
        resolution,
        start,
        end,
    }): Promise<OhlcvDataModel[]> {
        const candleRepository = this.getCandleRepositoryByResolutionAndMetric(
            resolution,
            metric,
        );
        const startDate = moment.unix(start).utc().toString();
        const endDate = moment.unix(end).utc().toString();

        const queryResult = await candleRepository
            .createQueryBuilder()
            .select(`time_bucket('${resolution}', time) as bucket`)
            .addSelect('first(open, time) as open')
            .addSelect('last(close, time) as close')
            .addSelect('min(low) as low')
            .addSelect('max(high) as high')
            .addSelect('sum(volume) as volume')
            .where('series = :series', { series })
            .andWhere('time between :startDate and :endDate', {
                startDate,
                endDate,
            })
            .groupBy('bucket')
            .orderBy('bucket', 'DESC')
            .getRawMany();

        if (!queryResult) {
            return [];
        }

        const alignedOpenCloseRows = queryResult.map((row, index) => {
            if (index === queryResult.length - 1) {
                return row;
            }

            if (row.open !== queryResult[index + 1].close) {
                row.open = queryResult[index + 1].close;
            }

            return row;
        });

        return alignedOpenCloseRows.reverse().map(
            (row) =>
                new OhlcvDataModel({
                    time: row.bucket,
                    ohlcv: [
                        row.open ?? null,
                        row.high ?? null,
                        row.low ?? null,
                        row.close ?? null,
                        row.volume ?? null,
                    ],
                }),
        );
    }

    private getCandleModelByResolution(
        resolution: PriceCandlesResolutions,
    ): Repository<PriceCandleMinute | PriceCandleHourly | PriceCandleDaily> {
        if (resolution.includes('minute')) {
            return this.priceCandleMinute;
        }

        if (resolution.includes('hour')) {
            return this.priceCandleHourly;
        }

        return this.priceCandleDaily;
    }

    private getCandleRepositoryByResolutionAndMetric(
        resolution: PriceCandlesResolutions,
        metric: string,
    ): Repository<
        | TokenCandlesMinute
        | TokenCandlesHourly
        | TokenCandlesDaily
        | PairFirstTokenCandlesMinute
        | PairFirstTokenCandlesHourly
        | PairFirstTokenCandlesDaily
        | PairSecondTokenCandlesMinute
        | PairSecondTokenCandlesHourly
        | PairSecondTokenCandlesDaily
    > {
        switch (metric) {
            case 'priceUSD':
                if (resolution.includes('minute')) {
                    return this.tokenCandlesMinute;
                }
                if (resolution.includes('hour')) {
                    return this.tokenCandlesHourly;
                }
                return this.tokenCandlesDaily;

            case 'firstTokenPrice':
                if (resolution.includes('minute')) {
                    return this.pairFirstTokenCandlesMinute;
                }
                if (resolution.includes('hour')) {
                    return this.pairFirstTokenCandlesHourly;
                }
                return this.pairFirstTokenCandlesDaily;

            case 'secondTokenPrice':
                if (resolution.includes('minute')) {
                    return this.pairSecondTokenCandlesMinute;
                }
                if (resolution.includes('hour')) {
                    return this.pairSecondTokenCandlesHourly;
                }
                return this.pairSecondTokenCandlesDaily;

            default:
                return undefined;
        }
    }
}
