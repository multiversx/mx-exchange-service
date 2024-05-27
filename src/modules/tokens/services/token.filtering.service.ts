import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { TokenService } from './token.service';
import { TokensFilter } from '../models/tokens.filter.args';

@Injectable()
export class TokenFilteringService {
    constructor(
        @Inject(forwardRef(() => TokenService))
        private readonly tokenService: TokenService,
    ) {}

    tokensByIdentifier(
        tokensFilter: TokensFilter,
        tokenIDs: string[],
    ): string[] {
        if (
            !tokensFilter.identifiers ||
            tokensFilter.identifiers.length === 0
        ) {
            return tokenIDs;
        }

        return tokenIDs.filter((tokenID) =>
            tokensFilter.identifiers.includes(tokenID),
        );
    }

    async tokensByType(
        tokensFilter: TokensFilter,
        tokenIDs: string[],
    ): Promise<string[]> {
        if (!tokensFilter.type) {
            return tokenIDs;
        }

        const filteredIDs = [];
        for (const tokenID of tokenIDs) {
            const tokenType = await this.tokenService.getEsdtTokenType(tokenID);

            if (tokenType === tokensFilter.type) filteredIDs.push(tokenID);
        }
        return filteredIDs;
    }
}
