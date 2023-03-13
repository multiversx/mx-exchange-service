import { CMCApiGetterService } from '../api.cmc.getter.service';

export class CMCApiGetterServiceMock {
    async getUSDCPrice(): Promise<number> {
        return 1;
    }
}

export const CMCApiGetterServiceProvider = {
    provide: CMCApiGetterService,
    useClass: CMCApiGetterServiceMock,
};
