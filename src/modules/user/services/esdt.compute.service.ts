import { Injectable } from '@nestjs/common';
import { PairService } from 'src/modules/pair/services/pair.service';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import { computeValueUSD } from 'src/utils/token.converters';
import { UserToken } from '../models/user.model';
import { TokenService } from 'src/modules/tokens/services/token.service';

@Injectable()
export class UserEsdtComputeService {
    constructor(
        private readonly pairService: PairService,
        private readonly tokenService: TokenService,
    ) {}

    async esdtTokenUSD(esdtToken: EsdtToken): Promise<UserToken> {
        const [token] = await this.allEsdtTokensUSD([esdtToken]);
        return token;
    }

    async allEsdtTokensUSD(esdtTokens: EsdtToken[]): Promise<UserToken[]> {
        const tokens = await this.tokenService.getAllTokensMetadata(
            esdtTokens.map((esdtToken) => esdtToken.identifier),
        );

        return tokens.map(
            (esdtToken, index) =>
                new UserToken({
                    ...esdtToken,
                    balance: esdtTokens[index].balance,
                    valueUSD: computeValueUSD(
                        esdtTokens[index].balance,
                        esdtToken.decimals,
                        esdtToken.price,
                    ).toFixed(),
                }),
        );
    }

    async lpTokenUSD(
        esdtToken: EsdtToken,
        pairAddress: string,
    ): Promise<UserToken> {
        const [token] = await this.allLpTokensUSD([esdtToken], [pairAddress]);
        return token;
    }

    async allLpTokensUSD(
        esdtTokens: EsdtToken[],
        pairAddresses: string[],
    ): Promise<UserToken[]> {
        const valuesUSD = await this.pairService.getAllLiquidityPositionsUSD(
            pairAddresses,
            esdtTokens.map((token) => token.balance),
        );

        const tokens = await this.tokenService.getAllTokensMetadata(
            esdtTokens.map((esdtToken) => esdtToken.identifier),
        );

        return tokens.map(
            (esdtToken, index) =>
                new UserToken({
                    ...esdtToken,
                    balance: esdtTokens[index].balance,
                    valueUSD: valuesUSD[index],
                    pairAddress: pairAddresses[index],
                }),
        );
    }
}
