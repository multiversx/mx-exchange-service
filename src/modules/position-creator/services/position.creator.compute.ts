import { TypedValue } from '@multiversx/sdk-core/out';
import { EsdtTokenPayment } from '@multiversx/sdk-exchange';
import { PerformanceProfiler } from '@multiversx/sdk-nestjs-monitoring';
import { Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { constantsConfig } from 'src/config';
import {
    SWAP_TYPE,
    SwapRouteModel,
} from 'src/modules/auto-router/models/auto-route.model';
import { AutoRouterService } from 'src/modules/auto-router/services/auto-router.service';
import { AutoRouterTransactionService } from 'src/modules/auto-router/services/auto-router.transactions.service';
import { PairModel } from 'src/modules/pair/models/pair.model';
import { PairAbiService } from 'src/modules/pair/services/pair.abi.service';
import { PairComputeService } from 'src/modules/pair/services/pair.compute.service';
import { PairService } from 'src/modules/pair/services/pair.service';
import { RouterAbiService } from 'src/modules/router/services/router.abi.service';

export type PositionCreatorSingleTokenInput = {
    swapRouteArgs: TypedValue[];
    amountOutMin: BigNumber;
};

@Injectable()
export class PositionCreatorComputeService {
    constructor(
        private readonly pairAbi: PairAbiService,
        private readonly pairService: PairService,
        private readonly pairCompute: PairComputeService,
        private readonly routerAbi: RouterAbiService,
        private readonly autoRouterService: AutoRouterService,
        private readonly autoRouterTransaction: AutoRouterTransactionService,
    ) {}

    async computeSwap(
        pairAddress: string,
        fromTokenID: string,
        toTokenID: string,
        amount: string,
    ): Promise<BigNumber> {
        if (fromTokenID === toTokenID) {
            return new BigNumber(amount);
        }

        const amountOut = await this.pairService.getAmountOut(
            pairAddress,
            fromTokenID,
            amount,
        );

        return new BigNumber(amountOut);
    }

    async computeSingleTokenPairInput(
        pairAddress: string,
        payment: EsdtTokenPayment,
        tolerance: number,
    ): Promise<SwapRouteModel[]> {
        const acceptedPairedTokensIDs =
            await this.routerAbi.commonTokensForUserPairs();

        const [
            firstToken,
            secondToken,
            lpTokenID,
            firstTokenPriceUSD,
            secondTokenPriceUSD,
            reserves,
            totalFeePercent,
        ] = await Promise.all([
            this.pairService.getFirstToken(pairAddress),
            this.pairService.getSecondToken(pairAddress),
            this.pairAbi.lpTokenID(pairAddress),
            this.pairCompute.firstTokenPriceUSD(pairAddress),
            this.pairCompute.secondTokenPriceUSD(pairAddress),
            this.pairAbi.pairInfoMetadata(pairAddress),
            this.pairAbi.totalFeePercent(pairAddress),
        ]);

        if (payment.tokenIdentifier === lpTokenID) {
            return [];
        }

        const [tokenInID, tokenOutID] = acceptedPairedTokensIDs.includes(
            firstToken.identifier,
        )
            ? [firstToken.identifier, secondToken.identifier]
            : [secondToken.identifier, firstToken.identifier];

        const profiler = new PerformanceProfiler();

        const swapRoutes = [];

        const swapRoute = await this.autoRouterService.swap({
            tokenInID: payment.tokenIdentifier,
            amountIn: payment.amount,
            tokenOutID: tokenInID,
            tolerance,
        });

        swapRoutes.push(swapRoute);

        profiler.stop('swap route', true);

        const halfPayment = new BigNumber(swapRoute.amountOut)
            .dividedBy(2)
            .integerValue()
            .toFixed();

        const remainingPayment = new BigNumber(swapRoute.amountOut)
            .minus(halfPayment)
            .toFixed();

        const [amount0, amount1] = await Promise.all([
            await this.computeSwap(
                pairAddress,
                tokenInID,
                tokenInID,
                halfPayment,
            ),
            await this.computeSwap(
                pairAddress,
                tokenInID,
                tokenOutID,
                remainingPayment,
            ),
        ]);

        swapRoutes.push(
            new SwapRouteModel({
                swapType: SWAP_TYPE.fixedInput,
                tokenInID,
                tokenOutID,
                amountIn: amount0.toFixed(),
                amountOut: amount1.toFixed(),
                tokenRoute: [tokenInID, tokenOutID],
                pairs: [
                    new PairModel({
                        address: pairAddress,
                        firstToken,
                        secondToken,
                        info: reserves,
                        totalFeePercent,
                    }),
                ],
                intermediaryAmounts: [amount0.toFixed(), amount1.toFixed()],
                tolerance: tolerance,
                tokenInExchangeRate: new BigNumber(amount1)
                    .dividedBy(amount0)
                    .toFixed(),
                tokenOutExchangeRate: new BigNumber(amount0)
                    .dividedBy(amount1)
                    .toFixed(),
                tokenInPriceUSD:
                    tokenInID === firstToken.identifier
                        ? firstTokenPriceUSD
                        : secondTokenPriceUSD,
                tokenOutPriceUSD:
                    tokenOutID === firstToken.identifier
                        ? firstTokenPriceUSD
                        : secondTokenPriceUSD,
            }),
        );

        return swapRoutes;
    }

    async computeSingleTokenInput(
        payment: EsdtTokenPayment,
        tolerance: number,
    ): Promise<PositionCreatorSingleTokenInput> {
        const swapRoute = await this.autoRouterService.swap({
            tokenInID: payment.tokenIdentifier,
            amountIn: payment.amount,
            tokenOutID: constantsConfig.MEX_TOKEN_ID,
            tolerance,
        });

        const amountOutMin = new BigNumber(swapRoute.amountOut)
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
            amountOutMin,
        };
    }
}
