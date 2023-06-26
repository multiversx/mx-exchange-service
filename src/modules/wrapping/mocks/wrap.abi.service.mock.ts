import { IWrapAbiService } from '../services/interfaces';
import { WrapAbiService } from '../services/wrap.abi.service';

export class WrapAbiServiceMock implements IWrapAbiService {
    async wrappedEgldTokenID(): Promise<string> {
        return 'WEGLD-123456';
    }
}

export const WrapAbiServiceProvider = {
    provide: WrapAbiService,
    useClass: WrapAbiServiceMock,
};
