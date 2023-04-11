import { IWrapAbiService } from '../services/interfaces';
import { WrapAbiService } from '../services/wrap.abi.service';

export class WrapAbiServiceMock implements IWrapAbiService {
    async wrappedEgldTokenID(): Promise<string> {
        return 'TOK1-1111';
    }
}

export const WrapAbiServiceProvider = {
    provide: WrapAbiService,
    useClass: WrapAbiServiceMock,
};
