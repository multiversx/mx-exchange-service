import { Injectable } from '@nestjs/common';
import {
    CandleDataModel,
    HistoricDataModel,
} from 'src/modules/analytics/models/analytics.model';
import { TimescaleDBQueryService } from '../timescaledb/timescaledb.query.service';
import { AnalyticsQueryInterface } from '../interfaces/analytics.query.interface';
import { AnalyticsQueryArgs } from '../entities/analytics.query.args';

@Injectable()
export class AnalyticsQueryService implements AnalyticsQueryInterface {
    constructor(private readonly timescaleDBQuery: TimescaleDBQueryService) {}

    async getAggregatedValue(args: {
        series: any;
        metric: any;
        time: any;
    }): Promise<string> {
        const service = await this.getService();
        return await service.getAggregatedValue(args);
    }

    async getLatestCompleteValues(args: {
        series: any;
        metric: any;
        time?: any;
        start?: any;
    }): Promise<HistoricDataModel[]> {
        const service = await this.getService();
        return await service.getLatestCompleteValues(args);
    }

    async getSumCompleteValues(args: {
        series: any;
        metric: any;
    }): Promise<HistoricDataModel[]> {
        const service = await this.getService();
        return await service.getSumCompleteValues(args);
    }

    async getValues24h(args: {
        series: any;
        metric: any;
    }): Promise<HistoricDataModel[]> {
        const service = await this.getService();
        return await service.getValues24h(args);
    }

    async getValues24hSum(args: {
        series: any;
        metric: any;
    }): Promise<HistoricDataModel[]> {
        const service = await this.getService();
        return await service.getValues24hSum(args);
    }

    async getHourlySumValues(args: {
        series: any;
        metric: any;
        time?: any;
        start?: any;
    }): Promise<HistoricDataModel[]> {
        const service = await this.getService();
        return await service.getHourlySumValues(args);
    }

    async getPDlatestValue({
        series,
        metric,
    }: AnalyticsQueryArgs): Promise<HistoricDataModel> {
        const service = await this.getService();
        return await service.getPDlatestValue({ series, metric });
    }

    async getPDCloseValues({
        series,
        metric,
        timeBucket,
        startDate,
        endDate,
    }): Promise<HistoricDataModel[]> {
        const service = await this.getService();
        return await service.getPDCloseValues({
            series,
            metric,
            timeBucket,
            startDate,
            endDate,
        });
    }

    async getPriceCandles({
        series,
        metric,
        resolution,
        start,
        end,
    }): Promise<CandleDataModel[]> {
        const service = await this.getService();
        return await service.getPriceCandles({
            series,
            metric,
            resolution,
            start,
            end,
        });
    }

    private async getService(): Promise<AnalyticsQueryInterface> {
        return this.timescaleDBQuery;
    }
}
