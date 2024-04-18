import { HistoricDataModel } from 'src/modules/analytics/models/analytics.model';
import { AnalyticsQueryArgs } from '../entities/analytics.query.args';

export interface AnalyticsQueryInterface {
    getAggregatedValue(args: AnalyticsQueryArgs): Promise<string>;

    getLatestCompleteValues(
        args: AnalyticsQueryArgs,
    ): Promise<HistoricDataModel[]>;

    getSumCompleteValues(
        args: AnalyticsQueryArgs,
    ): Promise<HistoricDataModel[]>;

    getValues24h(args: AnalyticsQueryArgs): Promise<HistoricDataModel[]>;

    getValues24hSum(args: AnalyticsQueryArgs): Promise<HistoricDataModel[]>;

    getPDlatestValue({
        series,
        metric,
    }: AnalyticsQueryArgs): Promise<HistoricDataModel>;

    getPDCloseValues({
        series,
        metric,
        timeBucket,
        startDate,
        endDate,
    }): Promise<HistoricDataModel[]>;

    getValues7d(args: AnalyticsQueryArgs): Promise<HistoricDataModel[]>;
}
