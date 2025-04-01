import { BadRequestException } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { PairModel } from 'src/modules/pair/models/pair.model';
import { getAmountOut } from 'src/modules/pair/pair.utils';
import { denominateAmount } from 'src/utils/token.converters';
import { SWAP_TYPE } from '../../auto-router/models/auto-route.model';
import { ParallelRouteAllocation } from '../models/models';

export class GrokSmartRouterService {
    async computeBestSwapRoute(
        paths: string[][],
        pairs: PairModel[],
        amount: string,
        swapType: SWAP_TYPE,
    ): Promise<{
        allocations: ParallelRouteAllocation[];
        totalResult: string;
    }> {
        if (swapType === SWAP_TYPE.fixedInput) {
            // Step 1: Select top routes
            const topRoutes = this.selectTopRoutes(paths, pairs, 3); // K=3

            // const topRoutes = await this.selectTopRoutes(paths, tokenIn, tokenOut, amount);
            // const virtualReserves = await this.initializeVirtualReserves(paths);

            // Step 2: Allocate input amount across top routes
            const allocations = this.incrementalAllocation(
                topRoutes,
                pairs,
                amount,
            );
            // Step 3: Compute intermediary amounts for each allocation
            const intermediaryAmounts =
                this.computeIntermediaryAmountsForAllocations(
                    allocations,
                    pairs,
                );

            // Step 4: Build ParallelRouteAllocation array
            const parallelAllocations: ParallelRouteAllocation[] =
                allocations.map((alloc, index) => {
                    const intermediary = intermediaryAmounts[index];
                    return {
                        tokenRoute: alloc.path,
                        addressRoute: this.getAddressRoute(pairs, alloc.path),
                        inputAmount: intermediary[0], // First element is the input amount
                        outputAmount: intermediary[intermediary.length - 1], // Last element is the output
                        intermediaryAmounts: intermediary, // Full array of amounts
                    };
                });

            // Step 5: Compute total output
            const totalResult = this.computeTotalOutput(intermediaryAmounts);
            return {
                allocations: parallelAllocations,
                totalResult,
            };
        } else {
            // Handle fixed output similarly if needed
            throw new BadRequestException('Fixed output not implemented');
        }
    }

    private selectTopRoutes(
        paths: string[][],
        pairs: PairModel[],
        K: number,
    ): string[][] {
        const marginalReturns = paths.map((path) =>
            this.computeInitialMarginalReturn(path, pairs),
        );
        const pathWithReturns = paths.map((path, idx) => ({
            path,
            return: marginalReturns[idx],
        }));
        pathWithReturns.sort((a, b) => b.return.comparedTo(a.return));
        return pathWithReturns.slice(0, K).map((pr) => pr.path);
    }

    private computeInitialMarginalReturn(
        path: string[],
        pairs: PairModel[],
    ): BigNumber {
        let marginalReturn = new BigNumber(1);
        for (let i = 0; i < path.length - 1; i++) {
            const pair = this.getPairByTokens(pairs, path[i], path[i + 1]);
            if (!pair) return new BigNumber(0);
            const [reserveIn, reserveOut] = this.getOrderedReserves(
                path[i],
                pair,
            );
            const gamma = new BigNumber(1).minus(pair.totalFeePercent / 100);
            marginalReturn = marginalReturn.times(
                gamma.times(reserveOut).div(reserveIn),
            );
        }
        return marginalReturn;
    }

    private incrementalAllocation(
        routes: string[][],
        pairs: PairModel[],
        totalInput: string,
    ): { path: string[]; allocation: BigNumber }[] {
        const allocations = routes.map((path) => ({
            path,
            allocation: new BigNumber(0),
        }));
        const virtualReserves = this.cloneReserves(pairs);
        const delta = new BigNumber(totalInput).div(100); // Step size: 1% of total input
        let remaining = new BigNumber(totalInput);

        while (remaining.gt(0)) {
            let maxMarginalReturn = new BigNumber(0);
            let bestRouteIndex = -1;
            for (let i = 0; i < routes.length; i++) {
                const currentMarginalReturn = this.computeCurrentMarginalReturn(
                    routes[i],
                    virtualReserves,
                );
                if (currentMarginalReturn.gt(maxMarginalReturn)) {
                    maxMarginalReturn = currentMarginalReturn;
                    bestRouteIndex = i;
                }
            }
            if (bestRouteIndex === -1) break;
            const allocationAmount = BigNumber.minimum(delta, remaining);
            allocations[bestRouteIndex].allocation =
                allocations[bestRouteIndex].allocation.plus(allocationAmount);
            remaining = remaining.minus(allocationAmount);
            this.simulateTradeAlongPath(
                routes[bestRouteIndex],
                allocationAmount,
                virtualReserves,
            );
        }

        return allocations.filter((a) => a.allocation.gt(0));
    }

    private computeCurrentMarginalReturn(
        path: string[],
        virtualReserves: Map<
            string,
            { reserve0: string; reserve1: string; totalFeePercent: number }
        >,
    ): BigNumber {
        let marginalReturn = new BigNumber(1);
        for (let i = 0; i < path.length - 1; i++) {
            const pair = this.getPairByTokensFromReserves(
                virtualReserves,
                path[i],
                path[i + 1],
            );
            if (!pair) return new BigNumber(0);
            const [reserveIn, reserveOut] = this.getOrderedReservesFromVirtual(
                path[i],
                pair,
            );
            const gamma = new BigNumber(1).minus(pair.totalFeePercent / 100);
            marginalReturn = marginalReturn.times(
                gamma.times(reserveOut).div(reserveIn),
            );
        }
        return marginalReturn;
    }

    private simulateTradeAlongPath(
        path: string[],
        amountIn: BigNumber,
        virtualReserves: Map<
            string,
            { reserve0: string; reserve1: string; totalFeePercent: number }
        >,
    ) {
        let currentAmount = amountIn;
        for (let i = 0; i < path.length - 1; i++) {
            const pair = this.getPairByTokensFromReserves(
                virtualReserves,
                path[i],
                path[i + 1],
            );
            if (!pair) return;
            const [reserveIn, reserveOut] = this.getOrderedReservesFromVirtual(
                path[i],
                pair,
            );
            const amountOut = getAmountOut(
                currentAmount.toFixed(),
                reserveIn,
                reserveOut,
                pair.totalFeePercent,
            );
            // Update virtual reserves
            if (path[i] === pair.firstToken) {
                virtualReserves.get(pair.address).reserve0 = new BigNumber(
                    reserveIn,
                )
                    .plus(currentAmount)
                    .toFixed();
                virtualReserves.get(pair.address).reserve1 = new BigNumber(
                    reserveOut,
                )
                    .minus(amountOut)
                    .toFixed();
            } else {
                virtualReserves.get(pair.address).reserve1 = new BigNumber(
                    reserveIn,
                )
                    .plus(currentAmount)
                    .toFixed();
                virtualReserves.get(pair.address).reserve0 = new BigNumber(
                    reserveOut,
                )
                    .minus(amountOut)
                    .toFixed();
            }
            currentAmount = new BigNumber(amountOut);
        }
    }

    private computeIntermediaryAmountsForAllocations(
        allocations: { path: string[]; allocation: BigNumber }[],
        pairs: PairModel[],
    ): string[][] {
        return allocations.map(({ path, allocation }) => {
            const amounts: string[] = [allocation.toFixed()]; // Start with input amount as string
            let currentAmount = allocation;
            for (let i = 0; i < path.length - 1; i++) {
                const pair = this.getPairByTokens(pairs, path[i], path[i + 1]);
                if (!pair) break;
                const [reserveIn, reserveOut] = this.getOrderedReserves(
                    path[i],
                    pair,
                );
                const amountOut = getAmountOut(
                    currentAmount.toFixed(),
                    reserveIn,
                    reserveOut,
                    pair.totalFeePercent,
                );
                amounts.push(amountOut.toFixed());
                currentAmount = amountOut;
            }
            return amounts;
        });
    }

    private computeTotalOutput(intermediaryAmounts: string[][]): string {
        return intermediaryAmounts
            .reduce(
                (sum, amounts) => sum.plus(amounts[amounts.length - 1]),
                new BigNumber(0),
            )
            .toFixed();
    }

    private cloneReserves(pairs: PairModel[]): Map<
        string,
        {
            reserve0: string;
            reserve1: string;
            totalFeePercent: number;
            firstToken: string;
            secondToken: string;
        }
    > {
        const virtualReserves = new Map();
        for (const pair of pairs) {
            virtualReserves.set(pair.address, {
                reserve0: pair.info.reserves0,
                reserve1: pair.info.reserves1,
                totalFeePercent: pair.totalFeePercent,
                firstToken: pair.firstToken.identifier,
                secondToken: pair.secondToken.identifier,
            });
        }
        return virtualReserves;
    }

    private getPairByTokensFromReserves(
        virtualReserves: Map<string, any>,
        tokenIn: string,
        tokenOut: string,
    ): any {
        for (const [address, pair] of virtualReserves) {
            if (
                (tokenIn === pair.firstToken &&
                    tokenOut === pair.secondToken) ||
                (tokenIn === pair.secondToken && tokenOut === pair.firstToken)
            ) {
                return { address, ...pair };
            }
        }
        return undefined;
    }

    private getOrderedReservesFromVirtual(
        tokenIn: string,
        pair: any,
    ): [string, string] {
        return tokenIn === pair.firstToken
            ? [pair.reserve0, pair.reserve1]
            : [pair.reserve1, pair.reserve0];
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
