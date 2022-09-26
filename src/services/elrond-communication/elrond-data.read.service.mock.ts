import { ElrondDataReadService } from './elrond-data.read.service';

export class ElrondDataReadServiceMock {
    async isReadActive(): Promise<boolean> {
        return true;
    }

    async getAggregatedValue({ series, key, start }): Promise<string> {
        return '1000000000000000000';
    }
}

export const ElrondDataReadServiceProvider = {
    provide: ElrondDataReadService,
    useClass: ElrondDataReadServiceMock,
};
