import { DataApiQueryService } from "src/services/analytics/data-api/data-api.query.service";

export class DataApiQueryServiceMock {
    //TODO: implement this mock
}

export const DataApiQueryServiceProvider = {
    provide: DataApiQueryService,
    useClass: DataApiQueryServiceMock,
};
