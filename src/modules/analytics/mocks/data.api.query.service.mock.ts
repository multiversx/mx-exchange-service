import { TimescaleDBQueryService } from 'src/services/analytics/timescaledb/timescaledb.query.service';

export class DataApiQueryServiceMock {
    //TODO: implement this mock
}

export const DataApiQueryServiceProvider = {
    provide: TimescaleDBQueryService,
    useClass: DataApiQueryServiceMock,
};
