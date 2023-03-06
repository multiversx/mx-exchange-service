import { Inject, Injectable } from '@nestjs/common';
import moment from 'moment';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { HistoricDataModel } from 'src/modules/analytics/models/analytics.model';
import {
    computeTimeInterval,
    convertBinToTimeResolution,
    DataApiQuery,
} from 'src/utils/analytics.utils';
import { Logger } from 'winston';
import { AnalyticsQueryArgs } from '../entities/analytics.query.args';
import { AnalyticsQueryInterface } from '../interfaces/analytics.query.interface';
import {
    CloseDaily,
    CloseHourly,
    SumDaily,
    SumHourly,
    TokenBurnedWeekly,
    XExchangeAnalyticsEntity,
} from './entities/data.api.entities';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class DataApiQueryService implements AnalyticsQueryInterface {
    constructor(
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
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
    ) {}

    @DataApiQuery()
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

    @DataApiQuery()
    async getLatestCompleteValues({
        series,
        metric,
    }: AnalyticsQueryArgs): Promise<HistoricDataModel[]> {
        const firstRow = await this.dexAnalytics
            .createQueryBuilder()
            .select('timestamp')
            .where('series = :series', { series })
            .orderBy('timestamp', 'ASC')
            .limit(1)
            .getRawOne();

        if (!firstRow) {
            return [];
        }

        const query = await this.closeDaily
            .createQueryBuilder()
            .select("time_bucket_gapfill('1 day', time) as day")
            .addSelect('locf(last(last, time)) as last')
            .where('series = :series', { series })
            .andWhere('key = :metric', { metric })
            .andWhere('time between :start and now()', {
                start: firstRow.timestamp,
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
    }

    @DataApiQuery()
    async getSumCompleteValues({
        series,
        metric,
    }: AnalyticsQueryArgs): Promise<HistoricDataModel[]> {
        const firstRow = await this.dexAnalytics
            .createQueryBuilder()
            .select('timestamp')
            .where('series = :series', { series })
            .orderBy('timestamp', 'ASC')
            .limit(1)
            .getRawOne();

        if (!firstRow) {
            return [];
        }

        const query = await this.sumDaily
            .createQueryBuilder()
            .select("time_bucket_gapfill('1 day', time) as day")
            .addSelect('sum(sum) as sum')
            .where('series = :series', { series })
            .andWhere('key = :metric', { metric })
            .andWhere('time between :start and now()', {
                start: firstRow.timestamp,
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
    }

    @DataApiQuery()
    async getValues24h({
        series,
        metric,
    }: AnalyticsQueryArgs): Promise<HistoricDataModel[]> {
        const latestTimestamp = await this.closeDaily
            .createQueryBuilder()
            .select('time')
            .addSelect('last')
            .where('series = :series', { series })
            .andWhere('key = :metric', { metric })
            .orderBy('time', 'DESC')
            .limit(1)
            .getRawOne();

        if (!latestTimestamp) {
            return [];
        }

        const startDate = moment
            .utc(latestTimestamp.time)
            .isBefore(moment.utc().subtract(1, 'day'))
            ? moment.utc(latestTimestamp.time)
            : moment.utc().subtract(1, 'day');

        const query = await this.closeHourly
            .createQueryBuilder()
            .select("time_bucket_gapfill('1 hour', time) as hour")
            .addSelect('locf(last(last, time)) as last')
            .where('series = :series', { series })
            .andWhere('key = :metric', { metric })
            .andWhere('time between :start and now()', {
                start: startDate.toDate(),
            })
            .groupBy('hour')
            .getRawMany();

        const dayBefore = moment.utc().subtract(1, 'day');
        const results = query.filter((row) =>
            moment.utc(row.hour).isSameOrAfter(dayBefore),
        );

        for (const result of results) {
            if (result.last) {
                break;
            }
            result.last = latestTimestamp.last;
        }

        return (
            results.map(
                (row) =>
                    new HistoricDataModel({
                        timestamp: moment
                            .utc(row.hour)
                            .format('yyyy-MM-DD HH:mm:ss'),
                        value: row.last ?? '0',
                    }),
            ) ?? []
        );
    }

    @DataApiQuery()
    async getValues24hSum({
        series,
        metric,
    }: AnalyticsQueryArgs): Promise<HistoricDataModel[]> {
        const query = await this.sumHourly
            .createQueryBuilder()
            .select("time_bucket_gapfill('1 hour', time) as hour")
            .addSelect('sum(sum) as sum')
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
                        value: row.sum ?? '0',
                    }),
            ) ?? []
        );
    }

    @DataApiQuery()
    async getLatestHistoricData({
        time,
        series,
        metric,
        start,
    }: AnalyticsQueryArgs): Promise<HistoricDataModel[]> {
        const [startDate, endDate] = computeTimeInterval(time, start);
        const query = await this.dexAnalytics
            .createQueryBuilder()
            .select('time')
            .addSelect('value')
            .where('key = :metric', { metric })
            .andWhere('series = :series', { series })
            .andWhere(
                endDate
                    ? 'timestamp BETWEEN :startDate AND :endDate'
                    : 'timestamp >= :startDate',
                { startDate, endDate },
            )
            .orderBy('timestamp', 'ASC')
            .getRawMany();
        return (
            query?.map(
                (row) =>
                    new HistoricDataModel({
                        timestamp: moment
                            .utc(row.timestamp)
                            .format('yyyy-MM-DD HH:mm:ss'),
                        value: row.value,
                    }),
            ) ?? []
        );
    }

    @DataApiQuery()
    async getLatestBinnedHistoricData({
        time,
        series,
        metric,
        start,
        bin,
    }: AnalyticsQueryArgs): Promise<HistoricDataModel[]> {
        const [startDate, endDate] = computeTimeInterval(time, start);
        const timeResolution = convertBinToTimeResolution(bin);

        const query = await this.dexAnalytics
            .createQueryBuilder()
            .select(`time_bucket(${timeResolution}, timestamp) as time`)
            .addSelect('avg(value) as avg')
            .where('series = :series', { series })
            .andWhere('key = :metric', { metric })
            .andWhere('timestamp BETWEEN :startDate AND :endDate', {
                startDate,
                endDate,
            })
            .getRawMany();

        return (
            query?.map(
                (row) =>
                    new HistoricDataModel({
                        timestamp: moment
                            .utc(row.time)
                            .format('yyyy-MM-DD HH:mm:ss'),
                        value: row.avg,
                    }),
            ) ?? []
        );
    }
}
