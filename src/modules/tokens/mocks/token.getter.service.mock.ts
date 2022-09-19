/* eslint-disable @typescript-eslint/no-unused-vars */
import { Tokens } from 'src/modules/pair/mocks/pair.constants';
import { EsdtToken } from '../models/esdtToken.model';
import { TokenGetterService } from '../services/token.getter.service';

export class TokenGetterServiceMock {
    async getTokenMetadata(tokenID: string): Promise<EsdtToken> {
        return Tokens(tokenID);
    }

    async getEsdtTokenType(_tokenID: string): Promise<string> {
        return 'Jungle';
    }
}

export const TokenGetterServiceProvider = {
    provide: TokenGetterService,
    useClass: TokenGetterServiceMock,
};
