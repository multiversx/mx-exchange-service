/* eslint-disable @typescript-eslint/no-unused-vars */
import { Tokens, pairs } from 'src/modules/pair/mocks/pair.constants';
import { EsdtToken } from '../models/esdtToken.model';
import { TokenService } from '../services/token.service';

export class TokenServiceMock {
    async getTokenMetadata(tokenID: string): Promise<EsdtToken> {
        return Tokens(tokenID);
    }

    async esdtTokenType(tokenID: string): Promise<string> {
        return Tokens(tokenID).type;
    }

    async getUniqueTokenIDs(activePool: boolean): Promise<string[]> {
        const tokenIDs = [];
        for (const pair of pairs) {
            tokenIDs.push(pair.firstToken.identifier);
            tokenIDs.push(pair.secondToken.identifier);
        }

        return [...new Set(tokenIDs)];
    }
}

export const TokenServiceProvider = {
    provide: TokenService,
    useClass: TokenServiceMock,
};
