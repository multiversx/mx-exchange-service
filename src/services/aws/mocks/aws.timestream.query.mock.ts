import { AWSTimestreamQueryService } from '../aws.timestream.query';

export class AWSTimestreamQueryServiceMock {
    async getAggregatedValue({}): Promise<string> {
        return '0';
    }
}

export const AWSTimestreamQueryServiceProvider = {
    provide: AWSTimestreamQueryService,
    useClass: AWSTimestreamQueryServiceMock,
};
