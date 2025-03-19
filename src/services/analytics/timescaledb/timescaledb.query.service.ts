import { Inject, Injectable, Logger } from '@nestjs/common';
import moment from 'moment';
import {
    CandleDataModel,
    HistoricDataModel,
    OhlcvDataModel,
} from 'src/modules/analytics/models/analytics.model';
import { computeTimeInterval } from 'src/utils/analytics.utils';
import { AnalyticsQueryArgs } from '../entities/analytics.query.args';
import { AnalyticsQueryInterface } from '../interfaces/analytics.query.interface';
import {
    CloseDaily,
    CloseHourly,
    PDCloseMinute,
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
import { Constants, ErrorLoggerAsync } from '@multiversx/sdk-nestjs-common';
import { PriceCandlesResolutions } from 'src/modules/analytics/models/query.args';
import { GetOrSetCache } from 'src/helpers/decorators/caching.decorator';

@Injectable()
export class TimescaleDBQueryService implements AnalyticsQueryInterface {
    constructor(
        @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
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

            startDate = moment(startDate).startOf('day').toDate();

            const query = await this.closeDaily
                .createQueryBuilder()
                .select("time_bucket_gapfill('1 day', time) as day")
                .addSelect(`locf(last(last, time)) as last`)
                .where('series = :series', { series })
                .andWhere('key = :metric', { metric })
                .andWhere('time between :startDate and :endDate', {
                    startDate,
                    endDate,
                })
                .groupBy('day')
                .getRawMany();

            return await this.gapfillCloseData(
                query,
                series,
                metric,
                startDate,
                this.closeDaily,
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
                    start: moment(startDate).startOf('day').toDate(),
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
            const endDate = moment().utc().toDate();
            const startDate = moment()
                .subtract(1, 'day')
                .utc()
                .startOf('hour')
                .toDate();

            const query = await this.closeHourly
                .createQueryBuilder()
                .select("time_bucket_gapfill('1 hour', time) as hour")
                .addSelect(`locf(last(last, time)) as last`)
                .where('series = :series', { series })
                .andWhere('key = :metric', { metric })
                .andWhere('time between :startDate and :endDate', {
                    startDate,
                    endDate,
                })
                .groupBy('hour')
                .getRawMany();

            return await this.gapfillCloseData(
                query,
                series,
                metric,
                startDate,
                this.closeHourly,
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

            const endDate = moment().utc().toDate();
            const startDate = moment()
                .subtract(1, 'day')
                .utc()
                .startOf('hour')
                .toDate();

            const query = await this.sumHourly
                .createQueryBuilder()
                .select("time_bucket_gapfill('1 hour', time) as hour")
                .addSelect('sum(sum) as sum')
                .where(seriesWhere, { series })
                .andWhere('key = :metric', { metric })
                .andWhere('time between :startDate and :endDate', {
                    startDate,
                    endDate,
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

    async getStartDate(series: string): Promise<string | undefined> {
        const allStartDates = await this.allStartDates();

        if (!series.includes('%')) {
            return allStartDates[series] ?? undefined;
        }

        const seriesWithoutWildcard = series.replace(new RegExp('%', 'g'), '');
        const filteredTimestamps = [];
        for (const [key, value] of Object.entries(allStartDates)) {
            if (!key.includes(seriesWithoutWildcard)) {
                continue;
            }
            filteredTimestamps.push(moment(value));
        }

        if (filteredTimestamps.length === 0) {
            return undefined;
        }

        return moment.min(filteredTimestamps).toISOString();
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'timescaledb',
        remoteTtl: Constants.oneMinute() * 30,
        localTtl: Constants.oneMinute() * 20,
    })
    private async allStartDates(): Promise<object> {
        return await this.allStartDatesRaw();
    }

    private async allStartDatesRaw(): Promise<object> {
        const startDateRows = await this.closeDaily
            .createQueryBuilder()
            .select('series')
            .addSelect('min(time) as earliest_timestamp')
            .groupBy('series')
            .getRawMany();

        const allDates = {};

        for (let i = 0; i < startDateRows.length; i++) {
            const row = startDateRows[i];
            allDates[row.series] = row.earliest_timestamp;
        }

        return allDates;
    }

    @TimescaleDBQuery()
    async getTokenMiniChartPriceCandles({
        series,
        start,
        end,
    }): Promise<CandleDataModel[]> {
        const resolution = PriceCandlesResolutions.HOUR_4;
        const metric = 'priceUSD';

        const candleRepository = this.getCandleRepositoryByResolutionAndMetric(
            resolution,
            metric,
        );

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

    private async gapfillCloseData(
        data: any[],
        series: string,
        metric: string,
        previousStartDate: Date,
        repository: Repository<CloseHourly | CloseDaily>,
    ): Promise<HistoricDataModel[]> {
        if (!data || data.length === 0) {
            return [];
        }

        const timeColumn =
            repository instanceof Repository &&
            repository.target === CloseHourly
                ? 'hour'
                : 'day';

        if (data[0].last) {
            return this.formatCloseData(data, timeColumn);
        }

        const startDate = await this.getStartDate(series);
        const endDate = previousStartDate;

        if (!startDate) {
            return this.formatCloseData(data, timeColumn);
        }

        const previousValue = await repository
            .createQueryBuilder()
            .select('last, time')
            .where('series = :series', { series })
            .andWhere('key = :metric', { metric })
            .andWhere('time between :start and :end', {
                start: moment(startDate).utc().toDate(),
                end: endDate,
            })
            .orderBy('time', 'DESC')
            .limit(1)
            .getRawOne();

        if (!previousValue) {
            return this.formatCloseData(data, timeColumn);
        }

        return this.formatCloseData(data, timeColumn, previousValue.last);
    }

    private formatCloseData(
        data: any[],
        timeColumn: 'hour' | 'day',
        gapfillValue = '0',
    ): HistoricDataModel[] {
        return data.map(
            (row) =>
                new HistoricDataModel({
                    timestamp: moment
                        .utc(row[timeColumn])
                        .format('yyyy-MM-DD HH:mm:ss'),
                    value: row.last ?? gapfillValue,
                }),
        );
    }
}
