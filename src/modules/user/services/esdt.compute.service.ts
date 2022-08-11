import { Injectable } from '@nestjs/common';
import { PairGetterService } from 'src/modules/pair/services/pair.getter.service';
import { PairService } from 'src/modules/pair/services/pair.service';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import { computeValueUSD } from 'src/utils/token.converters';
import { UserToken } from '../models/user.model';

@Injectable()
export class UserEsdtComputeService {
    constructor(
        private readonly pairService: PairService,
        private readonly pairGetterService: PairGetterService,
    ) {}

    async esdtTokenUSD(esdtToken: EsdtToken): Promise<UserToken> {
        const tokenPriceUSD = await this.pairGetterService.getTokenPriceUSD(
            esdtToken.identifier,
        );
        return new UserToken({
            ...esdtToken,
            valueUSD: computeValueUSD(
                esdtToken.balance,
                esdtToken.decimals,
                tokenPriceUSD,
            ).toFixed(),
        });
    }

    async lpTokenUSD(
        esdtToken: EsdtToken,
        pairAddress: string,
    ): Promise<UserToken> {
        const valueUSD = await this.pairService.getLiquidityPositionUSD(
            pairAddress,
            esdtToken.balance,
        );
        return new UserToken({
            ...esdtToken,
            valueUSD: valueUSD,
        });
    }
}
