import BigNumber from 'bignumber.js';
import { PairModel } from 'src/modules/pair/models/pair.model';
import { getAmountIn, getAmountOut } from 'src/modules/pair/pair.utils';
import { SWAP_TYPE } from 'src/modules/auto-router/models/auto-route.model';
import { ParallelRouteAllocation } from '../../models/models';
import {
    getAddressRoute,
    getOrderedReserves,
    getPairByTokens,
} from '../../router.utils';

interface RouteCandidate {
    path: string[];
    poolsUsed: string[]; // addresses of PairModel
    singleRouteOutput: BigNumber; // final tokenOut if we push ALL user input
}

export class RC2SmartRouterService {
    /**
     * Returns route allocations that together maximize final output for the user,
     * ignoring all routes that share a pool (by grouping).
     */
    async computeBestSwapRoute(
        paths: string[][],
        pairs: PairModel[],
        amount: string,
        swapType = SWAP_TYPE.fixedInput,
    ): Promise<{
        allocations: ParallelRouteAllocation[];
        totalResult: string;
    }> {
        // --------------------------
        // 1) Build RouteCandidates
        // --------------------------

        const totalInBN = new BigNumber(amount);
        if (totalInBN.isZero()) {
            throw new Error('Total input amount cannot be zero');
        }

        // Create a RouteCandidate for each path
        const allCandidates: RouteCandidate[] = paths.map((path) => {
            const poolsUsed = this.getPoolsUsedByPath(path, pairs);
            const routeOutput = this.computeRouteOutputFixedIn(
                path,
                pairs,
                totalInBN,
            );
            return {
                path,
                poolsUsed,
                singleRouteOutput: routeOutput,
            };
        });

        // Filter out routes that yield 0 even if we put all input into them.
        const viableCandidates = allCandidates.filter((rc) =>
            rc.singleRouteOutput.gt(0),
        );
        if (viableCandidates.length === 0) {
            throw new Error(
                `All candidate routes produce zero output for input = ${totalInBN}`,
            );
        }

        // --------------------------
        // 2) Build conflict graph: routes share a pool => edge
        // --------------------------
        // We'll represent the conflict graph as adjacency lists: index i => array of indices j in conflict
        const adjList: number[][] = new Array(viableCandidates.length)
            .fill(null)
            .map(() => []);
        for (let i = 0; i < viableCandidates.length; i++) {
            for (let j = i + 1; j < viableCandidates.length; j++) {
                if (
                    this.routesSharePool(
                        viableCandidates[i],
                        viableCandidates[j],
                    )
                ) {
                    // conflict
                    adjList[i].push(j);
                    adjList[j].push(i);
                }
            }
        }

        // --------------------------
        // 3) Find connected components => "groups"
        // --------------------------
        const visited = new Array(viableCandidates.length).fill(false);
        const groups: number[][] = [];
        for (let i = 0; i < viableCandidates.length; i++) {
            if (!visited[i]) {
                // BFS or DFS to get the connected component containing i
                const component: number[] = [];
                const stack = [i];
                visited[i] = true;
                while (stack.length > 0) {
                    const curr = stack.pop();
                    component.push(curr);
                    for (const nbr of adjList[curr]) {
                        if (!visited[nbr]) {
                            visited[nbr] = true;
                            stack.push(nbr);
                        }
                    }
                }
                groups.push(component);
            }
        }

        // --------------------------
        // 4) Pick one route per group (by highest singleRouteOutput)
        // --------------------------
        const chosenRoutes: RouteCandidate[] = [];
        for (const group of groups) {
            let bestRoute: RouteCandidate | null = null;
            let bestOutput = new BigNumber(0);
            for (const idx of group) {
                const cand = viableCandidates[idx];
                if (cand.singleRouteOutput.gt(bestOutput)) {
                    bestOutput = cand.singleRouteOutput;
                    bestRoute = cand;
                }
            }
            if (bestRoute) {
                chosenRoutes.push(bestRoute);
            }
        }

        // If after grouping we end up with zero routes (very unlikely), throw
        if (chosenRoutes.length === 0) {
            throw new Error('No non-conflicting routes found');
        }

        const uniqueRoutes = chosenRoutes.map((route) => route.path);

        return this.computeAllocationsIterativeFixedInput(
            uniqueRoutes,
            pairs,
            amount,
        );
    }

    // ----------------------------------------------------------------------
    // HELPER METHODS
    // ----------------------------------------------------------------------

    /**
     * Return true if two routes share a pool. We can do this by checking if
     * any address in routeA.poolsUsed is also in routeB.poolsUsed.
     */
    private routesSharePool(a: RouteCandidate, b: RouteCandidate): boolean {
        const setA = new Set(a.poolsUsed);
        return b.poolsUsed.some((pool) => setA.has(pool));
    }

    /**
     * Gather the pool (pair) addresses used by this path. For each consecutive pair of tokens
     * in the path, find the corresponding PairModel.address.
     */
    private getPoolsUsedByPath(path: string[], pairs: PairModel[]): string[] {
        const addresses: string[] = [];
        for (let i = 0; i < path.length - 1; i++) {
            const pair = getPairByTokens(pairs, path[i], path[i + 1]);
            if (pair) {
                addresses.push(pair.address);
            }
        }
        return addresses;
    }

    /**
     * The "standard" function that returns how much tokenOut we get if
     * we push `amountIn` of tokenIn through the consecutive pools in `path`.
     */
    private computeRouteOutputFixedIn(
        path: string[],
        pairs: PairModel[],
        amountIn: BigNumber,
    ): BigNumber {
        let currentAmount = amountIn;
        for (let i = 0; i < path.length - 1; i++) {
            const tokenInID = path[i];
            const tokenOutID = path[i + 1];
            const pair = getPairByTokens(pairs, tokenInID, tokenOutID);
            if (!pair) {
                return new BigNumber(0);
            }
            const [resIn, resOut] = getOrderedReserves(tokenInID, pair);
            const [resInBN, resOutBN] = [
                new BigNumber(resIn),
                new BigNumber(resOut),
            ];
            if (
                resInBN.isZero() ||
                resOutBN.isZero() ||
                currentAmount.isZero()
            ) {
                return new BigNumber(0);
            }
            currentAmount = getAmountOut(
                currentAmount.toFixed(),
                resIn,
                resOut,
                pair.totalFeePercent,
            );
            if (currentAmount.isZero()) {
                return new BigNumber(0);
            }
        }
        return currentAmount;
    }

    // ===========================================================================================================
    // ------------------------~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~-------------------------------
    // ===========================================================================================================

    /**
     * Compute allocations for routes with shared pools (fixed input)
     */
    private computeAllocationsIterativeFixedInput(
        paths: string[][],
        pairs: PairModel[],
        amount: string,
    ): {
        allocations: ParallelRouteAllocation[];
        totalResult: string;
    } {
        const totalAmount = new BigNumber(amount);
        let bestOutput = new BigNumber(0);
        let bestAllocations: ParallelRouteAllocation[] = [];

        // Start with the single best route as a baseline
        for (const path of paths) {
            const singleRouteResult = this.allocateToSingleRoute(
                path,
                pairs,
                amount,
                SWAP_TYPE.fixedInput,
            );

            const output = new BigNumber(singleRouteResult.totalResult);

            if (output.isGreaterThan(bestOutput)) {
                bestOutput = output;
                bestAllocations = singleRouteResult.allocations;
            }
        }

        // Helper to test a specific allocation distribution
        const testAllocation = (
            distribution: number[],
        ): {
            output: BigNumber;
            allocations: ParallelRouteAllocation[];
        } => {
            const sum = distribution.reduce((a, b) => a + b, 0);
            const normalized = distribution.map((d) => d / sum);
            const amounts = normalized.map((n) =>
                totalAmount.multipliedBy(n).toFixed(),
            );

            const routeAllocations: ParallelRouteAllocation[] = [];
            let totalOutput = new BigNumber(0);

            for (let i = 0; i < paths.length; i++) {
                if (normalized[i] > 0) {
                    const intermediaryAmounts =
                        this.computeIntermediaryAmountsFixedInput(
                            paths[i],
                            pairs,
                            amounts[i],
                        );

                    const outputAmount =
                        intermediaryAmounts[intermediaryAmounts.length - 1];

                    routeAllocations.push({
                        tokenRoute: paths[i],
                        addressRoute: getAddressRoute(pairs, paths[i]),
                        inputAmount: amounts[i],
                        outputAmount,
                        intermediaryAmounts,
                    });

                    totalOutput = totalOutput.plus(outputAmount);
                }
            }

            return {
                output: totalOutput,
                allocations: routeAllocations,
            };
        };

        // Test combinations of 2 routes with various allocation ratios
        for (let i = 0; i < paths.length; i++) {
            for (let j = i + 1; j < paths.length; j++) {
                for (let ratio = 0.1; ratio <= 0.9; ratio += 0.05) {
                    const distribution = Array(paths.length).fill(0);
                    distribution[i] = ratio;
                    distribution[j] = 1 - ratio;

                    const result = testAllocation(distribution);

                    if (result.output.isGreaterThan(bestOutput)) {
                        bestOutput = result.output;
                        bestAllocations = result.allocations;
                    }
                }
            }
        }

        // Test combinations of 3 routes (if we have enough routes)
        if (paths.length >= 3) {
            const numSamples = Math.min(100, paths.length * 20);
            // const numSamples = Math.min(10, paths.length);

            // Only test a limited number of combinations to avoid excessive computation
            for (let i = 0; i < paths.length; i++) {
                for (let j = i + 1; j < paths.length; j++) {
                    for (let k = j + 1; k < paths.length; k++) {
                        // for (let i = 0; i < Math.min(5, paths.length); i++) {
                        //     for (let j = i + 1; j < Math.min(6, paths.length); j++) {
                        //         for (let k = j + 1; k < Math.min(7, paths.length); k++) {
                        for (let sample = 0; sample < numSamples; sample++) {
                            // Generate random distribution for 3 routes
                            const r1 = Math.random();
                            const r2 = Math.random() * (1 - r1);
                            const r3 = 1 - r1 - r2;

                            const distribution = Array(paths.length).fill(0);
                            distribution[i] = r1;
                            distribution[j] = r2;
                            distribution[k] = r3;

                            const result = testAllocation(distribution);

                            if (result.output.isGreaterThan(bestOutput)) {
                                bestOutput = result.output;
                                bestAllocations = result.allocations;
                            }
                        }
                    }
                }
            }
        }

        return {
            allocations: bestAllocations,
            totalResult: bestOutput.toFixed(),
        };
    }

    /**
     * Allocate the entire amount to a single route
     */
    private allocateToSingleRoute(
        path: string[],
        pairs: PairModel[],
        amount: string,
        swapType: SWAP_TYPE,
    ): {
        allocations: ParallelRouteAllocation[];
        totalResult: string;
    } {
        let intermediaryAmounts: string[];
        let inputAmount: string;
        let outputAmount: string;

        if (swapType === SWAP_TYPE.fixedInput) {
            // Fixed input: compute how much output we get
            intermediaryAmounts = this.computeIntermediaryAmountsFixedInput(
                path,
                pairs,
                amount,
            );
            inputAmount = amount;
            outputAmount = intermediaryAmounts[intermediaryAmounts.length - 1];
        } else {
            // Fixed output: compute how much input we need
            intermediaryAmounts = this.computeIntermediaryAmountsFixedOutput(
                path,
                pairs,
                amount,
            );
            inputAmount = intermediaryAmounts[0];
            outputAmount = amount;
        }

        return {
            allocations: [
                {
                    tokenRoute: path,
                    addressRoute: getAddressRoute(pairs, path),
                    inputAmount,
                    outputAmount,
                    intermediaryAmounts,
                },
            ],
            totalResult:
                swapType === SWAP_TYPE.fixedInput ? outputAmount : inputAmount,
        };
    }

    /**
     * Compute intermediary amounts for fixed output swap
     */
    private computeIntermediaryAmountsFixedOutput(
        path: string[],
        pairs: PairModel[],
        fixedAmountOut: string,
    ): string[] {
        const pathAmounts: string[] = [];
        pathAmounts.push(fixedAmountOut);

        for (let index = path.length - 1; index > 0; index--) {
            const [tokenInID, tokenOutID] = [path[index - 1], path[index]];
            const pair = getPairByTokens(pairs, tokenInID, tokenOutID);
            if (pair === undefined) {
                throw new Error(
                    `No pool found for tokens ${tokenInID}-${tokenOutID}`,
                );
            }

            const [tokenInReserves, tokenOutReserves] = getOrderedReserves(
                tokenInID,
                pair,
            );

            const amountIn =
                new BigNumber(pathAmounts[0]) === new BigNumber(Infinity)
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

        return pathAmounts;
    }

    /**
     * Compute intermediary amounts for fixed input swap
     */
    private computeIntermediaryAmountsFixedInput(
        path: string[],
        pairs: PairModel[],
        initialAmountIn: string,
    ): string[] {
        const pathAmounts: string[] = [];
        pathAmounts.push(initialAmountIn);

        for (let index = 0; index < path.length - 1; index++) {
            const [tokenInID, tokenOutID] = [path[index], path[index + 1]];
            const pair = getPairByTokens(pairs, tokenInID, tokenOutID);
            if (pair === undefined) {
                // throw new Error(
                //     `No pool found for tokens ${tokenInID}-${tokenOutID}`,
                // );
                continue;
            }

            const [tokenInReserves, tokenOutReserves] = getOrderedReserves(
                tokenInID,
                pair,
            );

            const amountOut = getAmountOut(
                pathAmounts[pathAmounts.length - 1],
                tokenInReserves,
                tokenOutReserves,
                pair.totalFeePercent,
            );

            pathAmounts.push(amountOut.toFixed());
        }

        return pathAmounts;
    }
}
