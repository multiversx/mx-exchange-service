import { MXDataApiService } from './mx.data.api.service';

export class MXDataApiServiceMock {
    async getTokenPrice(tokenTicker: string): Promise<number> {
        return 1;
    }
}

export const MXDataApiServiceProvider = {
    provide: MXDataApiService,
    useClass: MXDataApiServiceMock,
};
