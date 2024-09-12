import { Injectable } from '@nestjs/common';
import { PairService } from 'src/modules/pair/services/pair.service';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import { computeValueUSD } from 'src/utils/token.converters';
import { UserToken } from '../models/user.model';
import { PairComputeService } from 'src/modules/pair/services/pair.compute.service';

@Injectable()
export class UserEsdtComputeService {
    constructor(
        private readonly pairService: PairService,
        private readonly pairCompute: PairComputeService,
    ) {}

    async esdtTokenUSD(esdtToken: EsdtToken): Promise<UserToken> {
        const tokenPriceUSD = await this.pairCompute.tokenPriceUSD(
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
            pairAddress,
        });
    }
}
