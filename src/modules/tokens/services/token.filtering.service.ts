import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { TokenService } from './token.service';
import { TokensFilter } from '../models/tokens.filter.args';
import { TokenComputeService } from './token.compute.service';
import BigNumber from 'bignumber.js';

@Injectable()
export class TokenFilteringService {
    constructor(
        @Inject(forwardRef(() => TokenService))
        private readonly tokenService: TokenService,
        @Inject(forwardRef(() => TokenComputeService))
        private readonly tokenCompute: TokenComputeService,
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

    async tokensByLiquidity(
        tokensFilter: TokensFilter,
        tokenIDs: string[],
    ): Promise<string[]> {
        if (!tokensFilter.minLiquidity) {
            return tokenIDs;
        }

        const filteredIDs = [];
        for (const tokenID of tokenIDs) {
            const liquidity = await this.tokenCompute.tokenLiquidityUSD(
                tokenID,
            );

            const liquidityBN = new BigNumber(liquidity);
            if (liquidityBN.gte(tokensFilter.minLiquidity)) {
                filteredIDs.push(tokenID);
            }
        }
        return filteredIDs;
    }
}
