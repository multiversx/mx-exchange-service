import { Injectable } from '@nestjs/common';
import {
    CandleDataModel,
    HistoricDataModel,
    OhlcvDataModel,
} from 'src/modules/analytics/models/analytics.model';
import { TimescaleDBQueryService } from '../timescaledb/timescaledb.query.service';
import { AnalyticsQueryInterface } from '../interfaces/analytics.query.interface';

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

    async getTokenMiniChartPriceCandles({
        series,
        start,
        end,
    }): Promise<CandleDataModel[]> {
        const service = await this.getService();
        return await service.getTokenMiniChartPriceCandles({
            series,
            start,
            end,
        });
    }

    async getCandles({
        series,
        metric,
        resolution,
        start,
        end,
    }): Promise<OhlcvDataModel[]> {
        const service = await this.getService();
        return await service.getCandles({
            series,
            metric,
            resolution,
            start,
            end,
        });
    }

    async getStartDate(series: string): Promise<string | undefined> {
        const service = await this.getService();
        return await service.getStartDate(series);
    }

    private async getService(): Promise<AnalyticsQueryInterface> {
        return this.timescaleDBQuery;
    }
}
