import { BadRequestException, Inject } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { PairModel } from 'src/modules/pair/models/pair.model';
import { getAmountIn, getAmountOut } from 'src/modules/pair/pair.utils';
import { denominateAmount } from 'src/utils/token.converters';
import { Logger } from 'winston';
import { SWAP_TYPE } from '../models/auto-route.model';

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

    async computeBestSwapRoute(
        paths: string[][],
        pairs: PairModel[],
        amount: string,
        swapType: SWAP_TYPE,
    ): Promise<BestSwapRoute> {
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

        const addressRoute = this.getAddressRoute(pairs, paths[pathIndex]);

        return {
            tokenRoute: paths[pathIndex],
            intermediaryAmounts: amounts[pathIndex],
            addressRoute,
            bestResult: bestAmount,
        };
    }

    private getPairByTokens(
        pairs: PairModel[],
        tokenIn: string,
        tokenOut: string,
    ): PairModel | undefined {
        for (const pair of pairs) {
            if (
                (tokenIn === pair.firstToken.identifier &&
                    tokenOut === pair.secondToken.identifier) ||
                (tokenIn === pair.secondToken.identifier &&
                    tokenOut === pair.firstToken.identifier)
            ) {
                return pair;
            }
        }

        return undefined;
    }

    private getOrderedReserves(
        tokenInID: string,
        pair: PairModel,
    ): [string, string] {
        return tokenInID === pair.firstToken.identifier
            ? [pair.info.reserves0, pair.info.reserves1]
            : [pair.info.reserves1, pair.info.reserves0];
    }

    private computeIntermediaryAmountsFixedInput(
        paths: string[][],
        pairs: PairModel[],
        initialAmountIn: string,
    ): Array<string[]> {
        const intermediaryAmounts: Array<string[]> = [];

        for (const path of paths) {
            const pathAmounts: string[] = [];
            pathAmounts.push(initialAmountIn);
            for (let index = 0; index < path.length - 1; index++) {
                const [tokenInID, tokenOutID] = [path[index], path[index + 1]];
                const pair = this.getPairByTokens(pairs, tokenInID, tokenOutID);
                if (pair === undefined) {
                    continue;
                }

                const [tokenInReserves, tokenOutReserves] =
                    this.getOrderedReserves(tokenInID, pair);
                const amountOut = getAmountOut(
                    pathAmounts[pathAmounts.length - 1],
                    tokenInReserves,
                    tokenOutReserves,
                    pair.totalFeePercent,
                );
                pathAmounts.push(amountOut.toFixed());
            }
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
                const pair = this.getPairByTokens(pairs, tokenInID, tokenOutID);
                if (pair === undefined) {
                    continue;
                }
                const [tokenInReserves, tokenOutReserves] =
                    this.getOrderedReserves(tokenInID, pair);
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

    private getAddressRoute(
        pairs: PairModel[],
        tokensRoute: string[],
    ): string[] {
        const addressRoute: string[] = [];

        for (let index = 0; index < tokensRoute.length - 1; index++) {
            const pair = this.getPairByTokens(
                pairs,
                tokensRoute[index],
                tokensRoute[index + 1],
            );
            if (pair === undefined) {
                continue;
            }
            addressRoute.push(pair.address);
        }

        return addressRoute;
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
