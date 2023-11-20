import { Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { PairService } from 'src/modules/pair/services/pair.service';
import { RouterService } from 'src/modules/router/services/router.service';

@Injectable()
export class PositionCreatorComputeService {
    constructor(
        private readonly pairService: PairService,
        private readonly routerService: RouterService,
    ) {}

    async computeSwap(
        fromTokenID: string,
        toTokenID: string,
        amount: string,
    ): Promise<BigNumber> {
        if (fromTokenID === toTokenID) {
            return new BigNumber(amount);
        }

        const pairs = await this.routerService.getAllPairs(0, 1, {
            address: null,
            issuedLpToken: true,
            firstTokenID: fromTokenID,
            secondTokenID: toTokenID,
            state: 'Active',
        });

        if (pairs.length === 0) {
            throw new Error('Pair not found');
        }

        const amountOut = await this.pairService.getAmountOut(
            pairs[0].address,
            fromTokenID,
            amount,
        );

        return new BigNumber(amountOut);
    }
}
