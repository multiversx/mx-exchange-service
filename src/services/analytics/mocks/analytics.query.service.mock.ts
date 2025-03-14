import {
    CandleDataModel,
    HistoricDataModel,
    OhlcvDataModel,
} from 'src/modules/analytics/models/analytics.model';
import { AnalyticsQueryArgs } from '../entities/analytics.query.args';
import { AnalyticsQueryInterface } from '../interfaces/analytics.query.interface';
import { AnalyticsQueryService } from '../services/analytics.query.service';

export class AnalyticsQueryServiceMock implements AnalyticsQueryInterface {
    getPDCloseValues({
        series,
        metric,
        timeBucket,
    }: {
        series: any;
        metric: any;
        timeBucket: any;
    }): Promise<HistoricDataModel[]> {
        throw new Error('Method not implemented.');
    }
    getAggregatedValue(args: AnalyticsQueryArgs): Promise<string> {
        throw new Error('Method not implemented.');
    }
    getLatestCompleteValues(
        args: AnalyticsQueryArgs,
    ): Promise<HistoricDataModel[]> {
        throw new Error('Method not implemented.');
    }
    getSumCompleteValues(
        args: AnalyticsQueryArgs,
    ): Promise<HistoricDataModel[]> {
        throw new Error('Method not implemented.');
    }
    getValues24h(args: AnalyticsQueryArgs): Promise<HistoricDataModel[]> {
        throw new Error('Method not implemented.');
    }
    getValues24hSum(args: AnalyticsQueryArgs): Promise<HistoricDataModel[]> {
        throw new Error('Method not implemented.');
    }
    getHourlySumValues(args: AnalyticsQueryArgs): Promise<HistoricDataModel[]> {
        throw new Error('Method not implemented.');
    }
    getTokenMiniChartPriceCandles({
        series,
        start,
        end,
    }): Promise<CandleDataModel[]> {
        throw new Error('Method not implemented.');
    }
    getCandles({ series, metric, start, end }): Promise<OhlcvDataModel[]> {
        throw new Error('Method not implemented.');
    }
    getStartDate(series: string): Promise<string> {
        throw new Error('Method not implemented.');
    }
}

export const AnalyticsQueryServiceProvider = {
    provide: AnalyticsQueryService,
    useClass: AnalyticsQueryServiceMock,
};
