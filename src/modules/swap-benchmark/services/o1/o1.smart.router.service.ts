import { BadRequestException } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { SWAP_TYPE } from 'src/modules/auto-router/models/auto-route.model';
import { PairModel } from 'src/modules/pair/models/pair.model';
import { getAmountIn, getAmountOut } from 'src/modules/pair/pair.utils';
import {
    computeAllRouteOutputs,
    Hop,
    PoolInfo,
    Route,
    sharedPoolSolver,
} from './solver';
import { ParallelRouteAllocation } from '../../models/models';
import { STEPS } from '../benchmark.service';
import {
    getAddressRoute,
    getOrderedReserves,
    getPairByTokens,
} from '../../router.utils';

export class O1SmartRouterService {
    computeBestSwapRouteWithSharedPools(
        paths: string[][], // each path is [HTM, WEGLD, UTK, USH], etc
        pairs: PairModel[],
        amount: string,
    ) {
        // 1) Build "pools" array from PairModel
        const poolInfos: PoolInfo[] = this.buildPoolInfos(pairs);

        // 2) Convert each path -> a Route with a Hop per pool
        const routes: Route[] = this.buildRoutes(paths, poolInfos);

        // 3) Convert totalInput to a number for our solver (be mindful of decimals!)
        const A_total = new BigNumber(amount);

        // 4) Solve
        const { xAlloc, totalOut } = sharedPoolSolver(
            routes,
            poolInfos,
            A_total,
        );

        // 5) Recompute final out amounts for each route individually
        const finalAmounts = computeAllRouteOutputs(routes, poolInfos, xAlloc);

        // 6) Build a result array describing each route & how much it got, how much it yields
        const allocations = routes.map((route, i) => {
            // gather the addresses in route
            const addressRoute = route.hops.map(
                (hop) => poolInfos[hop.poolIndex].address,
            );
            return {
                tokenRoute: paths[i],
                addressRoute,
                inputAmount: xAlloc[i].toFixed(),
                outputAmount: finalAmounts[i].toFixed(),
                intermediaryAmounts: [],
            };
        });

        // done
        return {
            allocations,
            totalResult: totalOut.toFixed(),
        };
    }

    private buildPoolInfos(pairs: PairModel[]): PoolInfo[] {
        // Build pool array. Each entry is (tokenIn, tokenOut, reservesIn, reservesOut, fee, address).
        // Must define a stable ordering so we can do "poolIndex" references consistently.
        const results: PoolInfo[] = [];
        for (const pair of pairs) {
            // Example: assume pair stores "reserve0" is for "firstToken", "reserve1" for "secondToken"
            // We might push both directions if we want to do big map lookups later.
            // Or just keep a single direction, but we must be consistent with how we define routes.
            results.push({
                address: pair.address,
                tokenIn: pair.firstToken.identifier,
                tokenOut: pair.secondToken.identifier,
                reserveIn: new BigNumber(pair.info.reserves0),
                reserveOut: new BigNumber(pair.info.reserves1),
                feePercent: pair.totalFeePercent,
            });
            // If you want "two-direction" in one object, you'll have to store a more advanced structure.
            // Or you do one PoolInfo for forward direction, another for reverse direction.
        }
        return results;
    }

    private buildRoutes(paths: string[][], poolInfos: PoolInfo[]): Route[] {
        // For each path = [A, X, B], we find a sequence of poolIndexes that connect it.
        // E.g. if path has 2 hops, we find pool that does A->X, then pool that does X->B
        return paths.map((path) => {
            const hops: Hop[] = [];
            for (let i = 0; i < path.length - 1; i++) {
                const tokenIn = path[i];
                const tokenOut = path[i + 1];
                const poolIndex = this.findPoolIndex(
                    tokenIn,
                    tokenOut,
                    poolInfos,
                );
                if (poolIndex < 0) {
                    throw new Error(`No pool from ${tokenIn} to ${tokenOut}`);
                }
                hops.push({ poolIndex });
            }
            return { hops };
        });
    }

    private findPoolIndex(
        tokenIn: string,
        tokenOut: string,
        pools: PoolInfo[],
    ): number {
        // find a pool with pool.tokenIn==tokenIn && pool.tokenOut==tokenOut
        return pools.findIndex(
            (p) =>
                (p.tokenIn === tokenIn && p.tokenOut === tokenOut) ||
                (p.tokenIn === tokenOut && p.tokenOut === tokenIn),
        );
    }

    /**
     * Main entry point: for a given set of paths, pairs, an amount, and swap type,
     * compute how to allocate the trade. For 'fixedInput', it tries to SPLIT across
     * multiple routes in parallel to maximize final output.
     */
    async computeBestSwapRoute(
        paths: string[][],
        pairs: PairModel[],
        amount: string,
        swapType: SWAP_TYPE,
    ): Promise<{
        allocations: ParallelRouteAllocation[];
        totalResult: string;
    }> {
        if (paths.length === 0) {
            throw new BadRequestException('No paths available');
        }

        // If it's a fixed-input scenario, do a multi-route allocation (SPLIT input across multiple routes)
        if (swapType === SWAP_TYPE.fixedInput) {
            return this.computeBestParallelAllocationFixedInput(
                paths,
                pairs,
                amount,
            );
        } else {
            // Keep your old single-route logic for fixedOutput (or adapt similarly)
            return this.computeSingleRouteFixedOutput(paths, pairs, amount);
        }
    }

    // --------------------------------------------------------------------------
    // 1) MULTI-ROUTE (PARALLEL) ALLOCATION FOR FIXED INPUT
    // --------------------------------------------------------------------------

    /**
     * Splits the given `amountIn` across ANY number of paths to maximize total B out.
     * Uses a simple incremental "marginal gains" approach as a demonstration.
     */
    private computeBestParallelAllocationFixedInput(
        paths: string[][],
        pairs: PairModel[],
        totalAmountIn: string,
    ): { allocations: ParallelRouteAllocation[]; totalResult: string } {
        const totalA = new BigNumber(totalAmountIn);
        if (totalA.lte(0)) {
            throw new BadRequestException('Amount in must be positive');
        }

        // We'll store how much A is allocated to each path
        const allocations = new Array<BigNumber>(paths.length).fill(
            new BigNumber(0),
        );
        let leftover = totalA;

        // You can choose how many increments to attempt; or use a more advanced approach
        // const STEPS = 100;
        const delta = totalA.div(STEPS);
        const visitedIndexes: number[] = [];

        // Repeatedly allocate 'delta' to whichever path yields best marginal improvement
        for (let step = 0; step < STEPS; step++) {
            if (leftover.lte(0)) break;

            let bestIndex = -1;
            let bestMarginalGain = new BigNumber(0);

            for (let i = 0; i < paths.length; i++) {
                const currentDetail = this.computeRouteFixedInputDetail(
                    paths[i],
                    pairs,
                    allocations[i],
                );
                const plusDetail = this.computeRouteFixedInputDetail(
                    paths[i],
                    pairs,
                    allocations[i].plus(delta),
                );

                // Marginal gain is finalOut(alloc+delta) - finalOut(alloc)
                const marginalGain = plusDetail.finalOut.minus(
                    currentDetail.finalOut,
                );
                if (marginalGain.gt(bestMarginalGain)) {
                    bestMarginalGain = marginalGain;
                    bestIndex = i;
                }
            }

            // if (
            //     bestIndex === -1 ||
            //     bestMarginalGain.lte(0) ||
            //     visitedIndexes.includes(bestIndex)
            // ) {
            if (bestIndex === -1 || bestMarginalGain.lte(0)) {
                // No improvement possible
                break;
            }

            allocations[bestIndex] = allocations[bestIndex].plus(delta);
            visitedIndexes.push(bestIndex);
            leftover = leftover.minus(delta);
            if (leftover.lt(0)) {
                leftover = new BigNumber(0);
            }
        }

        // Now compute final route outputs + intermediary amounts
        let sumOut = new BigNumber(0);
        const resultAllocations: ParallelRouteAllocation[] = [];

        for (let i = 0; i < paths.length; i++) {
            const allocA = allocations[i];
            if (allocA.gt(0)) {
                const detail = this.computeRouteFixedInputDetail(
                    paths[i],
                    pairs,
                    allocA,
                );
                sumOut = sumOut.plus(detail.finalOut);

                resultAllocations.push({
                    tokenRoute: paths[i],
                    addressRoute: getAddressRoute(pairs, paths[i]),
                    inputAmount: allocA.toFixed(),
                    outputAmount: detail.finalOut.toFixed(),
                    intermediaryAmounts: detail.intermediary,
                });
            }
        }

        return {
            allocations: resultAllocations,
            totalResult: sumOut.toFixed(),
        };
    }

    /**
     * For a single route [A, X, Y, B] with "amountIn" of A, returns
     * - the finalOut (amount of B),
     * - the per-hop intermediary amounts (including the initial input and final output).
     */
    private computeRouteFixedInputDetail(
        path: string[],
        pairs: PairModel[],
        amountIn: BigNumber,
    ): { finalOut: BigNumber; intermediary: string[] } {
        const amounts: string[] = [];
        let current = amountIn;

        // Start with the initial input
        amounts.push(current.toFixed());

        for (let i = 0; i < path.length - 1; i++) {
            const tokenIn = path[i];
            const tokenOut = path[i + 1];
            const pair = getPairByTokens(pairs, tokenIn, tokenOut);
            if (!pair) {
                // No direct swap
                return {
                    finalOut: new BigNumber(0),
                    intermediary: [amountIn.toFixed(), '0'],
                };
            }
            const [reserveIn, reserveOut] = getOrderedReserves(tokenIn, pair);

            current = getAmountOut(
                current.toFixed(),
                reserveIn,
                reserveOut,
                pair.totalFeePercent,
            );
            amounts.push(current.toFixed());
        }

        return { finalOut: current, intermediary: amounts };
    }

    // --------------------------------------------------------------------------
    // 2) OLD SINGLE-ROUTE LOGIC (USED FOR FIXED OUTPUT AS AN EXAMPLE)
    // --------------------------------------------------------------------------

    private computeSingleRouteFixedOutput(
        paths: string[][],
        pairs: PairModel[],
        fixedAmountOut: string,
    ): { allocations: ParallelRouteAllocation[]; totalResult: string } {
        const amountsByPath = this.computeIntermediaryAmountsFixedOutput(
            paths,
            pairs,
            fixedAmountOut,
        );

        const [bestAmount, pathIndex] = this.getBestAmountAndIndex(
            amountsByPath,
            SWAP_TYPE.fixedOutput,
        );
        if (pathIndex === -1) {
            throw new BadRequestException('No route found');
        }

        const bestPath = paths[pathIndex];
        const inputRequired = amountsByPath[pathIndex][0];
        const addressRoute = getAddressRoute(pairs, bestPath);

        // For consistency, let's build a dummy "intermediaryAmounts" for a single path:
        // we can re-run the logic from computeRouteFixedInputDetail in reverse... but
        // let's keep it simple here.
        return {
            allocations: [
                {
                    tokenRoute: bestPath,
                    addressRoute,
                    inputAmount: inputRequired,
                    outputAmount: fixedAmountOut,
                    intermediaryAmounts: amountsByPath[pathIndex], // be aware this is reversed perspective
                },
            ],
            totalResult: fixedAmountOut,
        };
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
                const [tokenInRes, tokenOutRes] = getOrderedReserves(
                    tokenInID,
                    pair,
                );
                const amountIn =
                    pathAmounts[0] === 'Infinity'
                        ? new BigNumber(0)
                        : getAmountIn(
                              pathAmounts[0],
                              tokenInRes,
                              tokenOutRes,
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

        for (const arr of amounts) {
            if (swapType === SWAP_TYPE.fixedInput) {
                const compareAmount = arr[arr.length - 1];
                if (bestAmount.isLessThan(compareAmount)) {
                    bestAmount = new BigNumber(compareAmount);
                    index = amounts.indexOf(arr);
                }
            } else {
                // fixedOutput => arr[0] is the input required
                const compareAmount = arr[0];
                if (bestAmount.isGreaterThan(compareAmount)) {
                    bestAmount = new BigNumber(compareAmount);
                    index = amounts.indexOf(arr);
                }
            }
        }

        return [bestAmount.toFixed(), index];
    }
}
