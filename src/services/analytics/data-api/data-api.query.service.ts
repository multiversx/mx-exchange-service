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
    ) {}

    @DataApiQuery()
    async getAggregatedValue({
        series,
        metric,
        time,
    }: AnalyticsQueryArgs): Promise<string> {
        const [startDate, endDate] = computeTimeInterval(time);

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
        const query = await this.closeDaily
            .createQueryBuilder()
            .select('time')
            .addSelect('last')
            .where('series = :series', { series })
            .andWhere('key = :metric', { metric })
            .getRawMany();
        return (
            query?.map(
                (row) =>
                    new HistoricDataModel({
                        timestamp: moment
                            .utc(row.time)
                            .format('yyyy-MM-DD HH:mm:ss'),
                        value: row.last,
                    }),
            ) ?? []
        );
    }

    @DataApiQuery()
    async getSumCompleteValues({
        series,
        metric,
    }: AnalyticsQueryArgs): Promise<HistoricDataModel[]> {
        const query = await this.sumDaily
            .createQueryBuilder()
            .select('time')
            .addSelect('sum')
            .where('series = :series', { series })
            .andWhere('key = :metric', { metric })
            .getRawMany();
        return (
            query?.map(
                (row) =>
                    new HistoricDataModel({
                        timestamp: moment
                            .utc(row.time)
                            .format('yyyy-MM-DD HH:mm:ss'),
                        value: row.sum,
                    }),
            ) ?? []
        );
    }

    @DataApiQuery()
    async getValues24h({
        series,
        metric,
    }: AnalyticsQueryArgs): Promise<HistoricDataModel[]> {
        const query = await this.closeHourly
            .createQueryBuilder()
            .select('time')
            .addSelect('last')
            .where('series = :series', { series })
            .andWhere('key = :metric', { metric })
            .andWhere("time > NOW() - INTERVAL '1 day'")
            .getRawMany();
        return (
            query?.map(
                (row) =>
                    new HistoricDataModel({
                        timestamp: moment
                            .utc(row.time)
                            .format('yyyy-MM-DD HH:mm:ss'),
                        value: row.last,
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
            .select('time')
            .addSelect('sum')
            .where('series = :series', { series })
            .andWhere('key = :metric', { metric })
            .andWhere("time > NOW() - INTERVAL '1 day'")
            .getRawMany();
        return (
            query?.map(
                (row) =>
                    new HistoricDataModel({
                        timestamp: moment
                            .utc(row.time)
                            .format('yyyy-MM-DD HH:mm:ss'),
                        value: row.sum,
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
