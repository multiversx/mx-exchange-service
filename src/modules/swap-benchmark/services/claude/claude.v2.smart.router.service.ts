import { Injectable, BadRequestException } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { PairModel } from 'src/modules/pair/models/pair.model';
import { getAmountIn, getAmountOut } from 'src/modules/pair/pair.utils';
import { SWAP_TYPE } from '../../../auto-router/models/auto-route.model';
import {
    getAddressRoute,
    getOrderedReserves,
    getPairByTokens,
} from '../../router.utils';
import { STEPS } from '../benchmark.service';
import { ParallelRouteAllocation } from '../../models/models';

// Simple marginal improvement implementation
@Injectable()
export class ClaudeV2SmartRouterService {
    async findOptimalRouting(
        paths: string[][],
        pairs: PairModel[],
        amount: string,
        swapType: SWAP_TYPE,
        maxRoutes = 4,
    ): Promise<{
        allocations: ParallelRouteAllocation[];
        totalResult: string;
    }> {
        // Choose the top paths to consider for optimization
        const topPaths = this.preSelectTopPaths(
            paths,
            pairs,
            amount,
            swapType,
            maxRoutes,
        );

        return this.computeBestSwapRoute(topPaths, pairs, amount, swapType);
    }

    /**
     * Pre-select the most promising paths to consider for optimization
     * This helps to reduce computation time by focusing on the most promising routes
     */
    private preSelectTopPaths(
        paths: string[][],
        pairs: PairModel[],
        amount: string,
        swapType: SWAP_TYPE,
        maxRoutes: number,
    ): string[][] {
        if (paths.length <= maxRoutes) {
            return paths;
        }

        // For fixed input: evaluate each path with a small test amount
        if (swapType === SWAP_TYPE.fixedInput) {
            const testAmount = new BigNumber(amount).dividedBy(100).toString(); // 1% of total amount
            const pathOutputs: { path: string[]; output: BigNumber }[] = [];

            for (const path of paths) {
                try {
                    const detail = this.computeRouteFixedInputDetail(
                        path,
                        pairs,
                        new BigNumber(testAmount),
                    );
                    pathOutputs.push({ path, output: detail.finalOut });
                } catch (e) {
                    // Skip paths that fail
                    continue;
                }
            }

            // Sort by output (descending) and take top maxRoutes
            pathOutputs.sort((a, b) => b.output.comparedTo(a.output));
            return pathOutputs.slice(0, maxRoutes).map((item) => item.path);
        } else {
            // For fixed output: evaluate each path for required input
            const testAmount = new BigNumber(amount).dividedBy(100).toString(); // 1% of total amount
            const pathInputs: { path: string[]; input: BigNumber }[] = [];

            for (const path of paths) {
                try {
                    // Get the required input for each path
                    const amounts = this.computeIntermediaryAmountsFixedOutput(
                        [path],
                        pairs,
                        testAmount,
                    )[0];
                    if (amounts[0] !== 'Infinity') {
                        pathInputs.push({
                            path,
                            input: new BigNumber(amounts[0]),
                        });
                    }
                } catch (e) {
                    // Skip paths that fail
                    continue;
                }
            }

            // Sort by input (ascending) and take top maxRoutes
            pathInputs.sort((a, b) => a.input.comparedTo(b.input));
            return pathInputs.slice(0, maxRoutes).map((item) => item.path);
        }
    }

    /**
     * Main entry point: compute the best allocation across routes for a given swap
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

        // If it's a fixed-input scenario, do a multi-route allocation
        if (swapType === SWAP_TYPE.fixedInput) {
            return this.computeBestParallelAllocationFixedInput(
                paths,
                pairs,
                amount,
            );
        } else {
            // For fixed output, find the route requiring minimum input
            return this.computeBestParallelAllocationFixedOutput(
                paths,
                pairs,
                amount,
            );
        }
    }

    /**
     * Compute optimal allocation for fixed input amount using marginal gains approach
     */
    private computeBestParallelAllocationFixedInput(
        paths: string[][],
        pairs: PairModel[],
        totalAmountIn: string,
    ): {
        allocations: ParallelRouteAllocation[];
        totalResult: string;
    } {
        const totalA = new BigNumber(totalAmountIn);
        if (totalA.lte(0)) {
            throw new BadRequestException('Amount in must be positive');
        }

        // We'll store how much A is allocated to each path
        const allocations = new Array<BigNumber>(paths.length).fill(
            new BigNumber(0),
        );
        let leftover = totalA;

        // Determine allocation increment size based on total amount
        // More steps = more accurate but slower
        // const STEPS = 100;
        const delta = totalA.div(STEPS);

        // Repeatedly allocate 'delta' to whichever path yields best marginal improvement
        for (let step = 0; step < STEPS; step++) {
            if (leftover.lte(0)) break;

            let bestIndex = -1;
            let bestMarginalGain = new BigNumber(0);

            for (let i = 0; i < paths.length; i++) {
                try {
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
                } catch (e) {
                    // Skip routes that would fail (e.g., insufficient liquidity)
                    continue;
                }
            }

            if (bestIndex === -1 || bestMarginalGain.lte(0)) {
                // No improvement possible
                break;
            }

            // Allocate delta to the best route
            allocations[bestIndex] = allocations[bestIndex].plus(delta);
            leftover = leftover.minus(delta);
        }

        // Allocate any remaining amount to the best route
        if (leftover.gt(0)) {
            let bestIndex = -1;
            let bestOutput = new BigNumber(0);

            for (let i = 0; i < paths.length; i++) {
                if (allocations[i].gt(0)) {
                    try {
                        const testAlloc = allocations[i].plus(leftover);
                        const detail = this.computeRouteFixedInputDetail(
                            paths[i],
                            pairs,
                            testAlloc,
                        );

                        if (detail.finalOut.gt(bestOutput)) {
                            bestOutput = detail.finalOut;
                            bestIndex = i;
                        }
                    } catch (e) {
                        continue;
                    }
                }
            }

            if (bestIndex >= 0) {
                allocations[bestIndex] = allocations[bestIndex].plus(leftover);
            }
        }

        // Now compute final route outputs + intermediary amounts
        let sumOut = new BigNumber(0);
        const resultAllocations: ParallelRouteAllocation[] = [];

        for (let i = 0; i < paths.length; i++) {
            const allocA = allocations[i];
            if (allocA.gt(0)) {
                try {
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
                } catch (e) {
                    console.log(
                        `Failed to compute final details for route: ${e.message}`,
                    );
                    // Skip this route in the final result
                }
            }
        }

        // Sort allocations by output amount (descending)
        resultAllocations.sort((a, b) =>
            new BigNumber(b.outputAmount).comparedTo(
                new BigNumber(a.outputAmount),
            ),
        );

        return {
            allocations: resultAllocations,
            totalResult: sumOut.toFixed(),
        };
    }

    /**
     * Compute optimal allocation for fixed output amount
     * For simplicity, we'll find the route that requires minimum input
     */
    private computeBestParallelAllocationFixedOutput(
        paths: string[][],
        pairs: PairModel[],
        fixedAmountOut: string,
    ): {
        allocations: ParallelRouteAllocation[];
        totalResult: string;
    } {
        const amountsByPath = this.computeIntermediaryAmountsFixedOutput(
            paths,
            pairs,
            fixedAmountOut,
        );

        // Find the path requiring minimum input
        let bestPathIndex = -1;
        let bestInputAmount = new BigNumber(Infinity);

        for (let i = 0; i < amountsByPath.length; i++) {
            const inputRequired = amountsByPath[i][0];
            if (inputRequired !== 'Infinity') {
                const inputBN = new BigNumber(inputRequired);
                if (inputBN.lt(bestInputAmount)) {
                    bestInputAmount = inputBN;
                    bestPathIndex = i;
                }
            }
        }

        if (bestPathIndex === -1) {
            throw new BadRequestException(
                'No valid route found for the requested output amount',
            );
        }

        const bestPath = paths[bestPathIndex];
        const addressRoute = getAddressRoute(pairs, bestPath);

        return {
            allocations: [
                {
                    tokenRoute: bestPath,
                    addressRoute,
                    inputAmount: bestInputAmount.toFixed(),
                    outputAmount: fixedAmountOut,
                    intermediaryAmounts: amountsByPath[bestPathIndex],
                },
            ],
            totalResult: bestInputAmount.toFixed(),
        };
    }

    /**
     * Calculate route details for fixed input
     * Returns final output amount and intermediary amounts
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
                throw new BadRequestException(
                    `No pair found for ${tokenIn} to ${tokenOut}`,
                );
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

    /**
     * Calculate intermediary amounts for fixed output swap
     */
    private computeIntermediaryAmountsFixedOutput(
        paths: string[][],
        pairs: PairModel[],
        fixedAmountOut: string,
    ): Array<string[]> {
        const intermediaryAmounts: Array<string[]> = [];

        for (const path of paths) {
            const pathAmounts: string[] = [];
            pathAmounts.push(fixedAmountOut);

            let invalidPath = false;

            for (let index = path.length - 1; index > 0; index--) {
                const [tokenInID, tokenOutID] = [path[index - 1], path[index]];
                const pair = getPairByTokens(pairs, tokenInID, tokenOutID);

                if (!pair) {
                    invalidPath = true;
                    break;
                }

                const [tokenInRes, tokenOutRes] = getOrderedReserves(
                    tokenInID,
                    pair,
                );

                try {
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
                } catch (e) {
                    // If getAmountIn fails (e.g., insufficient liquidity), mark path as invalid
                    invalidPath = true;
                    break;
                }
            }

            if (invalidPath) {
                // Add a path with Infinity as input to indicate it's invalid
                intermediaryAmounts.push([
                    'Infinity',
                    ...new Array(path.length - 1).fill('0'),
                ]);
            } else {
                intermediaryAmounts.push(pathAmounts);
            }
        }

        return intermediaryAmounts;
    }
}
