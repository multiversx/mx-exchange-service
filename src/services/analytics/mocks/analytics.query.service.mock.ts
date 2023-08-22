import { HistoricDataModel } from 'src/modules/analytics/models/analytics.model';
import { AnalyticsQueryInterface } from '../interfaces/analytics.query.interface';
import { AnalyticsQueryService } from '../services/analytics.query.service';

export class AnalyticsQueryServiceMock implements AnalyticsQueryInterface {
    getPDlatestValue(): Promise<HistoricDataModel> {
        throw new Error('Method not implemented.');
    }
    getPDCloseValues(): Promise<HistoricDataModel[]> {
        throw new Error('Method not implemented.');
    }
    getAggregatedValue(): Promise<string> {
        throw new Error('Method not implemented.');
    }
    getLatestCompleteValues(): Promise<HistoricDataModel[]> {
        throw new Error('Method not implemented.');
    }
    getSumCompleteValues(): Promise<HistoricDataModel[]> {
        throw new Error('Method not implemented.');
    }
    getValues24h(): Promise<HistoricDataModel[]> {
        throw new Error('Method not implemented.');
    }
    getValues24hSum(): Promise<HistoricDataModel[]> {
        throw new Error('Method not implemented.');
    }
}

export const AnalyticsQueryServiceProvider = {
    provide: AnalyticsQueryService,
    useClass: AnalyticsQueryServiceMock,
};
