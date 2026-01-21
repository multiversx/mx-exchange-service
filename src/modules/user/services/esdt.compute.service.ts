import { Injectable } from '@nestjs/common';
import { PairService } from 'src/modules/pair/services/pair.service';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import { computeValueUSD } from 'src/utils/token.converters';
import { UserToken } from '../models/user.model';
import { TokensStateService } from 'src/modules/state/services/tokens.state.service';
import { PairsStateService } from 'src/modules/state/services/pairs.state.service';

@Injectable()
export class UserEsdtComputeService {
    constructor(
        private readonly pairService: PairService,
        private readonly tokensState: TokensStateService,
        private readonly pairsState: PairsStateService,
    ) {}

    async esdtTokenUSD(esdtToken: EsdtToken): Promise<UserToken> {
        const [token] = await this.tokensState.getTokens([
            esdtToken.identifier,
        ]);
        return new UserToken({
            ...token,
            balance: esdtToken.balance,
            valueUSD: computeValueUSD(
                esdtToken.balance,
                esdtToken.decimals,
                token.price,
            ).toFixed(),
        });
    }

    async allEsdtTokensUSD(esdtTokens: EsdtToken[]): Promise<UserToken[]> {
        const tokens = await this.tokensState.getTokens(
            esdtTokens.map((esdtToken) => esdtToken.identifier),
        );

        return esdtTokens.map(
            (esdtToken, index) =>
                new UserToken({
                    ...tokens[index],
                    balance: esdtToken.balance,
                    valueUSD: computeValueUSD(
                        esdtToken.balance,
                        tokens[index].decimals,
                        tokens[index].price,
                    ).toFixed(),
                }),
        );
    }

    async lpTokenUSD(
        esdtToken: EsdtToken,
        pairAddress: string,
    ): Promise<UserToken> {
        const [lpUserToken] = await this.allLpTokensUSD(
            [esdtToken],
            [pairAddress],
        );
        return lpUserToken;
    }

    async allLpTokensUSD(
        esdtTokens: EsdtToken[],
        pairAddresses: string[],
    ): Promise<UserToken[]> {
        const pairs = await this.pairsState.getPairsWithTokens(pairAddresses, [
            'address',
            'info',
            'firstTokenPriceUSD',
            'secondTokenPriceUSD',
        ]);

        return esdtTokens.map((esdtToken, index) => {
            const pair = pairs[index];
            const liquidityPosition = this.pairService.computeLiquidityPosition(
                pair.info,
                esdtToken.balance,
            );
            const valueUSD = computeValueUSD(
                liquidityPosition.firstTokenAmount,
                pair.firstToken.decimals,
                pair.firstToken.price,
            )
                .plus(
                    computeValueUSD(
                        liquidityPosition.secondTokenAmount,
                        pair.secondToken.decimals,
                        pair.secondToken.price,
                    ),
                )
                .toFixed();
            return new UserToken({
                ...pair.liquidityPoolToken,
                balance: esdtToken.balance,
                valueUSD,
                pairAddress: pair.address,
            });
        });
    }
}
