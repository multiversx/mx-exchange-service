import { MockedTokens, Tokens } from 'src/modules/pair/mocks/pair.constants';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import {
    TokensFilter,
    TokenSortingArgs,
} from 'src/modules/tokens/models/tokens.filter.args';
import { TokensStateService } from '../services/tokens.state.service';

export class TokensStateServiceMock {
    async getTokens(
        tokenIDs: string[],
        fields: (keyof EsdtToken)[] = [],
    ): Promise<EsdtToken[]> {
        return tokenIDs.map((tokenID) => Tokens(tokenID));
    }

    async getFilteredTokens(
        offset: number,
        limit: number,
        filters: TokensFilter,
        sortArgs?: TokenSortingArgs,
        fields: (keyof EsdtToken)[] = [],
    ): Promise<{ tokens: EsdtToken[]; count: number }> {
        const tokenIDs: string[] = [];

        for (const tokenID of MockedTokens) {
            const token = Tokens(tokenID);

            if (filters.identifiers && !filters.identifiers.includes(tokenID)) {
                continue;
            }

            tokenIDs.push(token.identifier);
        }

        const tokens = await this.getTokens(
            tokenIDs.slice(offset, offset + limit),
            fields,
        );
        return { tokens: tokens, count: tokenIDs.length };
    }
}

export const TokensStateServiceProvider = {
    provide: TokensStateService,
    useClass: TokensStateServiceMock,
};
