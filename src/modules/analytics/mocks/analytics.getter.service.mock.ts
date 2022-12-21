import { AnalyticsGetterService } from '../services/analytics.getter.service';


export class AnalyticsGetterServiceMock {
    //TODO: implement this mock
}

export const AnalyticsGetterServiceProvider = {
    provide: AnalyticsGetterService,
    useClass: AnalyticsGetterServiceMock,
};