import { BadRequestException, Inject } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { PairModel } from 'src/modules/pair/models/pair.model';
import { getAmountIn } from 'src/modules/pair/pair.utils';
import { denominateAmount } from 'src/utils/token.converters';
import { Logger } from 'winston';
import { SWAP_TYPE } from '../models/auto-route.model';
import {
    computeRouteIntermediaryAmounts,
    getAddressRoute,
    getOrderedReserves,
    getPairByTokens,
} from 'src/utils/router.utils';

export type BestSwapRoute = {
    tokenRoute: string[];
    intermediaryAmounts: string[];
    addressRoute: string[];
    bestResult: string;
};

export class AutoRouterComputeService {
    constructor(
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    computeBestSwapRoute(
        paths: string[][],
        pairs: PairModel[],
        amount: string,
        swapType: SWAP_TYPE,
    ): BestSwapRoute {
        let amounts: string[][];
        if (swapType === SWAP_TYPE.fixedInput) {
            amounts = this.computeIntermediaryAmountsFixedInput(
                paths,
                pairs,
                amount,
            );
        } else {
            amounts = this.computeIntermediaryAmountsFixedOutput(
                paths,
                pairs,
                amount,
            );
        }

        const [bestAmount, pathIndex] = this.getBestAmountAndIndex(
            amounts,
            swapType,
        );

        if (pathIndex === -1) {
            throw new BadRequestException('No route found');
        }

        const addressRoute = getAddressRoute(pairs, paths[pathIndex]);

        return {
            tokenRoute: paths[pathIndex],
            intermediaryAmounts: amounts[pathIndex],
            addressRoute,
            bestResult: bestAmount,
        };
    }

    private computeIntermediaryAmountsFixedInput(
        paths: string[][],
        pairs: PairModel[],
        initialAmountIn: string,
    ): Array<string[]> {
        const intermediaryAmounts: Array<string[]> = [];

        for (const path of paths) {
            const pathAmounts = computeRouteIntermediaryAmounts(
                path,
                pairs,
                initialAmountIn,
            );
            intermediaryAmounts.push(pathAmounts);
        }

        return intermediaryAmounts;
    }

    private computeIntermediaryAmountsFixedOutput(
        paths: string[][],
        pairs: PairModel[],
        fixedAmountOut: string,
    ): Array<string[]> {
        const intermediaryAmounts: Array<string[]> = [];

        for (const path of paths) {
            const pathAmounts: string[] = [];
            pathAmounts.push(fixedAmountOut);
            for (let index = path.length - 1; index > 0; index--) {
                const [tokenInID, tokenOutID] = [path[index - 1], path[index]];
                const pair = getPairByTokens(pairs, tokenInID, tokenOutID);
                if (pair === undefined) {
                    continue;
                }
                const [tokenInReserves, tokenOutReserves] = getOrderedReserves(
                    tokenInID,
                    pair,
                );
                const amountIn =
                    pathAmounts[0] === 'Infinity'
                        ? new BigNumber(0)
                        : getAmountIn(
                              pathAmounts[0],
                              tokenInReserves,
                              tokenOutReserves,
                              pair.totalFeePercent,
                          );
                pathAmounts.unshift(
                    amountIn.isEqualTo(0) ? 'Infinity' : amountIn.toFixed(),
                );
            }
            intermediaryAmounts.push(pathAmounts);
        }

        return intermediaryAmounts;
    }

    private getBestAmountAndIndex(
        amounts: string[][],
        swapType: SWAP_TYPE,
    ): [string, number] {
        let bestAmount =
            swapType === SWAP_TYPE.fixedInput
                ? new BigNumber(0)
                : new BigNumber(Infinity);
        let index = -1;
        for (const amount of amounts) {
            if (swapType === SWAP_TYPE.fixedInput) {
                const compareAmount = amount[amount.length - 1];
                if (bestAmount.isLessThan(compareAmount)) {
                    bestAmount = new BigNumber(compareAmount);
                    index = amounts.indexOf(amount);
                }
            } else if (swapType === SWAP_TYPE.fixedOutput) {
                const compareAmount = amount[0];
                if (bestAmount.isGreaterThan(compareAmount)) {
                    bestAmount = new BigNumber(compareAmount);
                    index = amounts.indexOf(amount);
                }
            }
        }

        return [bestAmount.toFixed(), index];
    }

    computeFeeDenom(
        feePercent: number,
        amount: string,
        decimals: number,
    ): string {
        return denominateAmount(
            new BigNumber(amount).multipliedBy(feePercent).toFixed(),
            decimals,
        ).toFixed();
    }

    computePriceImpactPercent(reserves: string, amount: string): string {
        return new BigNumber(amount).dividedBy(reserves).times(100).toFixed();
    }
}
