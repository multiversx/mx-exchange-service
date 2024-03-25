import { Inject, Injectable, Logger } from '@nestjs/common';
import moment from 'moment';
import { HistoricDataModel } from 'src/modules/analytics/models/analytics.model';
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
} from './entities/timescaledb.entities';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { TimescaleDBQuery } from 'src/helpers/decorators/timescaledb.query.decorator';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

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
    }: AnalyticsQueryArgs): Promise<HistoricDataModel[]> {
        try {
            const firstRow = await this.dexAnalytics
                .createQueryBuilder()
                .select('timestamp')
                .where('series = :series', { series })
                .andWhere('key = :metric', { metric })
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
            const results =
                query?.map(
                    (row) =>
                        new HistoricDataModel({
                            timestamp: moment
                                .utc(row.day)
                                .format('yyyy-MM-DD HH:mm:ss'),
                            value: row.last ?? '0',
                        }),
                ) ?? [];
            return results;
        } catch (error) {
            this.logger.error('getLatestCompleteValues', {
                series,
                metric,
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
            const firstRow = await this.dexAnalytics
                .createQueryBuilder()
                .select('timestamp')
                .where('series = :series', { series })
                .andWhere('key = :metric', { metric })
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
            const query = await this.closeHourly
                .createQueryBuilder()
                .select("time_bucket_gapfill('1 hour', time) as hour")
                .addSelect('locf(last(last, time)) as last')
                .where('series = :series', { series })
                .andWhere('key = :metric', { metric })
                .andWhere("time between now() - INTERVAL '1 day' and now()")
                .groupBy('hour')
                .getRawMany();

            let results =
                query?.map(
                    (row) =>
                        new HistoricDataModel({
                            timestamp: moment
                                .utc(row.hour)
                                .format('yyyy-MM-DD HH:mm:ss'),
                            value: row.last ?? '0',
                        }),
                ) ?? [];

            results =
                results.length > 24
                    ? results.slice(results.length - 24)
                    : results;

            return results;
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
        } catch (error) {
            this.logger.error(
                `getValues24hSum: Error getting query for ${series} ${metric}`,
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
}
