/* eslint-disable @typescript-eslint/no-unused-vars */
import {
    Tokens,
    pairs,
    MockedTokens,
} from 'src/modules/pair/mocks/pair.constants';
import { BaseEsdtToken, EsdtToken } from '../models/esdtToken.model';
import { TokenService } from '../services/token.service';

export class TokenServiceMock {
    async tokenMetadata(tokenID: string): Promise<EsdtToken> {
        return Tokens(tokenID);
    }

    async tokenMetadataFromState(tokenID: string): Promise<EsdtToken> {
        return Tokens(tokenID);
    }

    async baseTokenMetadata(tokenID: string): Promise<BaseEsdtToken> {
        return new BaseEsdtToken({
            identifier: Tokens(tokenID).identifier,
            decimals: Tokens(tokenID).decimals,
        });
    }

    async getUniqueTokenIDs(activePool: boolean): Promise<string[]> {
        const tokenIDs = [];
        for (const pair of pairs) {
            tokenIDs.push(pair.firstToken.identifier);
            tokenIDs.push(pair.secondToken.identifier);
        }

        return [...new Set(tokenIDs)];
    }

    async getAllTokensMetadata(tokenIDs: string[]): Promise<EsdtToken[]> {
        return tokenIDs.map((tokenID) => Tokens(tokenID));
    }

    async getAllTokens(fields: (keyof EsdtToken)[] = []): Promise<EsdtToken[]> {
        return MockedTokens.map((tokenId) => Tokens(tokenId));
    }

    async getAllBaseTokensMetadata(
        tokenIDs: string[],
    ): Promise<BaseEsdtToken[]> {
        return tokenIDs.map(
            (tokenID) =>
                new BaseEsdtToken({
                    identifier: Tokens(tokenID).identifier,
                    decimals: Tokens(tokenID).decimals,
                }),
        );
    }
}

export const TokenServiceProvider = {
    provide: TokenService,
    useClass: TokenServiceMock,
};
