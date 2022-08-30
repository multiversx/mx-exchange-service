import { EsdtToken } from '../tokens/models/esdtToken.model';
import { Tokens } from 'src/modules/pair/mocks/pair.constants';
export class WrapServiceMock {
    async getWrappedEgldTokenID(): Promise<string> {
        return 'TOK1-1111';
    }

    async getWrappedEgldToken(): Promise<EsdtToken> {
        const wrappedEgldTokenID = await this.getWrappedEgldTokenID();
        return Tokens(wrappedEgldTokenID);
    }
}
