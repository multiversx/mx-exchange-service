/* eslint-disable @typescript-eslint/no-unused-vars */
import { Tokens } from 'src/modules/pair/mocks/pair.constants';
import { EsdtToken } from '../models/esdtToken.model';
import { TokenService } from '../services/token.service';

export class TokenServiceMock {
    async getTokenMetadata(tokenID: string): Promise<EsdtToken> {
        return Tokens(tokenID);
    }

    async esdtTokenType(tokenID: string): Promise<string> {
        return Tokens(tokenID).type;
    }
}

export const TokenServiceProvider = {
    provide: TokenService,
    useClass: TokenServiceMock,
};
