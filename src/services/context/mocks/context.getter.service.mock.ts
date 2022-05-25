import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import { Tokens } from 'src/modules/pair/mocks/pair.constants';

export class ContextGetterServiceMock {
    async getTokenMetadata(tokenID: string): Promise<EsdtToken> {
        return Tokens(tokenID);
    }

    async getCurrentEpoch(): Promise<number> {
        return 1;
    }
}
