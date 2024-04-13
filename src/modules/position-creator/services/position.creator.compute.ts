import { TypedValue } from '@multiversx/sdk-core/out';
import { EsdtTokenPayment } from '@multiversx/sdk-exchange';
import { PerformanceProfiler } from '@multiversx/sdk-nestjs-monitoring';
import { Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import {
    SWAP_TYPE,
    SwapRouteModel,
} from 'src/modules/auto-router/models/auto-route.model';
import { AutoRouterService } from 'src/modules/auto-router/services/auto-router.service';
import { PairModel } from 'src/modules/pair/models/pair.model';
import { PairAbiService } from 'src/modules/pair/services/pair.abi.service';
import { PairComputeService } from 'src/modules/pair/services/pair.compute.service';
import { PairService } from 'src/modules/pair/services/pair.service';
import { RouterAbiService } from 'src/modules/router/services/router.abi.service';
import { StakingPositionSingleTokenModel } from '../models/position.creator.model';
import { StakingAbiService } from 'src/modules/staking/services/staking.abi.service';
import { denominateAmount } from 'src/utils/token.converters';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import { constantsConfig, mxConfig } from 'src/config';
import { WrapAbiService } from 'src/modules/wrapping/services/wrap.abi.service';

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
        private readonly stakingAbi: StakingAbiService,
        private readonly autoRouterService: AutoRouterService,
        private readonly wrapAbi: WrapAbiService,
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
            wrappedTokenID,
            firstToken,
            secondToken,
            lpTokenID,
            firstTokenPriceUSD,
            secondTokenPriceUSD,
            reserves,
            totalFeePercent,
        ] = await Promise.all([
            this.wrapAbi.wrappedEgldTokenID(),
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

        const profiler = new PerformanceProfiler();

        const paymentTokenID =
            payment.tokenIdentifier === mxConfig.EGLDIdentifier
                ? wrappedTokenID
                : payment.tokenIdentifier;

        const swapRoutes = [];

        let amountOut: BigNumber;
        let tokenIn: EsdtToken;
        let tokenOut: EsdtToken;

        if (
            paymentTokenID !== firstToken.identifier &&
            paymentTokenID !== secondToken.identifier
        ) {
            [tokenIn, tokenOut] = acceptedPairedTokensIDs.includes(
                firstToken.identifier,
            )
                ? [firstToken, secondToken]
                : [secondToken, firstToken];

            const swapRoute = await this.autoRouterService.swap({
                tokenInID: paymentTokenID,
                amountIn: payment.amount,
                tokenOutID: tokenIn.identifier,
                tolerance,
            });

            swapRoutes.push(swapRoute);
            amountOut = new BigNumber(swapRoute.amountOut);
        } else {
            amountOut = new BigNumber(payment.amount);
            [tokenIn, tokenOut] =
                paymentTokenID === firstToken.identifier
                    ? [firstToken, secondToken]
                    : [secondToken, firstToken];
        }

        profiler.stop('swap route', true);

        const halfPayment = new BigNumber(amountOut)
            .dividedBy(2)
            .integerValue()
            .toFixed();

        const remainingPayment = new BigNumber(amountOut)
            .minus(halfPayment)
            .toFixed();

        const [amount0, amount1] = await Promise.all([
            await this.computeSwap(
                pairAddress,
                tokenIn.identifier,
                tokenIn.identifier,
                halfPayment,
            ),
            await this.computeSwap(
                pairAddress,
                tokenIn.identifier,
                tokenOut.identifier,
                remainingPayment,
            ),
        ]);

        const tokenInExchangeRate = new BigNumber(10)
            .pow(tokenOut.decimals)
            .multipliedBy(amount1)
            .dividedBy(amount0)
            .integerValue()
            .toFixed();
        const tokenOutExchangeRate = new BigNumber(10)
            .pow(tokenIn.decimals)
            .multipliedBy(amount0)
            .dividedBy(amount1)
            .integerValue()
            .toFixed();

        const priceDeviationPercent =
            await this.autoRouterService.getTokenPriceDeviationPercent(
                [tokenIn.identifier, tokenOut.identifier],
                [amount0.toFixed(), amount1.toFixed()],
            );

        swapRoutes.push(
            new SwapRouteModel({
                swapType: SWAP_TYPE.fixedInput,
                tokenInID: tokenIn.identifier,
                tokenOutID: tokenOut.identifier,
                amountIn: amount0.toFixed(),
                amountOut: amount1.toFixed(),
                tokenRoute: [tokenIn.identifier, tokenOut.identifier],
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
                tokenInExchangeRate: tokenInExchangeRate,
                tokenOutExchangeRate: tokenOutExchangeRate,
                tokenInExchangeRateDenom: denominateAmount(
                    tokenInExchangeRate,
                    tokenOut.decimals,
                ).toFixed(),
                tokenOutExchangeRateDenom: denominateAmount(
                    tokenOutExchangeRate,
                    tokenIn.decimals,
                ).toFixed(),
                tokenInPriceUSD:
                    tokenIn.identifier === firstToken.identifier
                        ? firstTokenPriceUSD
                        : secondTokenPriceUSD,
                tokenOutPriceUSD:
                    tokenOut.identifier === firstToken.identifier
                        ? firstTokenPriceUSD
                        : secondTokenPriceUSD,
                maxPriceDeviationPercent: constantsConfig.MAX_SWAP_SPREAD,
                tokensPriceDeviationPercent: priceDeviationPercent,
            }),
        );

        return swapRoutes;
    }

    async computeStakingPositionSingleToken(
        stakingAddress: string,
        payment: EsdtTokenPayment,
        tolerance: number,
    ): Promise<StakingPositionSingleTokenModel> {
        const farmingTokenID = await this.stakingAbi.farmingTokenID(
            stakingAddress,
        );
        const swapRoute = await this.computeSingleTokenInput(
            payment,
            farmingTokenID,
            tolerance,
        );
        return new StakingPositionSingleTokenModel({
            payment,
            swaps: [swapRoute],
        });
    }

    async computeSingleTokenInput(
        payment: EsdtTokenPayment,
        tokenOutID: string,
        tolerance: number,
    ): Promise<SwapRouteModel> {
        return this.autoRouterService.swap({
            tokenInID: payment.tokenIdentifier,
            amountIn: payment.amount,
            tokenOutID: tokenOutID,
            tolerance,
        });
    }
}
