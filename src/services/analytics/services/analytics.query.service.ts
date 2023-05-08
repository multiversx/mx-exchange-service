import { Injectable } from '@nestjs/common';
import { HistoricDataModel } from 'src/modules/analytics/models/analytics.model';
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

    private async getService(): Promise<AnalyticsQueryInterface> {
        return this.timescaleDBQuery;
    }
}
