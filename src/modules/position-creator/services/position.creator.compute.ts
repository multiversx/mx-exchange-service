import { TypedValue } from '@multiversx/sdk-core/out';
import { EsdtTokenPayment } from '@multiversx/sdk-exchange';
import { Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { SWAP_TYPE } from 'src/modules/auto-router/models/auto-route.model';
import { AutoRouterService } from 'src/modules/auto-router/services/auto-router.service';
import { AutoRouterTransactionService } from 'src/modules/auto-router/services/auto-router.transactions.service';
import { PairAbiService } from 'src/modules/pair/services/pair.abi.service';
import { PairService } from 'src/modules/pair/services/pair.service';
import { RouterAbiService } from 'src/modules/router/services/router.abi.service';
import { RouterService } from 'src/modules/router/services/router.service';

export type PositionCreatorSingleTokenPairInput = {
    swapRouteArgs: TypedValue[];
    amount0Min: BigNumber;
    amount1Min: BigNumber;
};

@Injectable()
export class PositionCreatorComputeService {
    constructor(
        private readonly pairAbi: PairAbiService,
        private readonly pairService: PairService,
        private readonly routerAbi: RouterAbiService,
        private readonly routerService: RouterService,
        private readonly autoRouterService: AutoRouterService,
        private readonly autoRouterTransaction: AutoRouterTransactionService,
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

    async computeSingleTokenPairInput(
        pairAddress: string,
        payment: EsdtTokenPayment,
        tolerance: number,
    ): Promise<PositionCreatorSingleTokenPairInput> {
        const acceptedPairedTokensIDs =
            await this.routerAbi.commonTokensForUserPairs();

        const [firstTokenID, secondTokenID] = await Promise.all([
            this.pairAbi.firstTokenID(pairAddress),
            this.pairAbi.secondTokenID(pairAddress),
        ]);

        const swapToTokenID = acceptedPairedTokensIDs.includes(firstTokenID)
            ? firstTokenID
            : secondTokenID;

        const swapRoute = await this.autoRouterService.swap({
            tokenInID: payment.tokenIdentifier,
            amountIn: payment.amount,
            tokenOutID: swapToTokenID,
            tolerance,
        });

        const halfPayment = new BigNumber(swapRoute.amountOut)
            .dividedBy(2)
            .integerValue()
            .toFixed();

        const remainingPayment = new BigNumber(swapRoute.amountOut)
            .minus(halfPayment)
            .toFixed();

        const [amount0, amount1] = await Promise.all([
            await this.computeSwap(
                swapRoute.tokenOutID,
                firstTokenID,
                halfPayment,
            ),
            await this.computeSwap(
                swapRoute.tokenOutID,
                secondTokenID,
                remainingPayment,
            ),
        ]);

        const amount0Min = new BigNumber(amount0)
            .multipliedBy(1 - tolerance)
            .integerValue();
        const amount1Min = new BigNumber(amount1)
            .multipliedBy(1 - tolerance)
            .integerValue();

        const swapRouteArgs =
            this.autoRouterTransaction.multiPairFixedInputSwaps({
                tokenInID: swapRoute.tokenInID,
                tokenOutID: swapRoute.tokenOutID,
                swapType: SWAP_TYPE.fixedInput,
                tolerance,
                addressRoute: swapRoute.pairs.map((pair) => pair.address),
                intermediaryAmounts: swapRoute.intermediaryAmounts,
                tokenRoute: swapRoute.tokenRoute,
            });

        return {
            swapRouteArgs,
            amount0Min,
            amount1Min,
        };
    }
}
