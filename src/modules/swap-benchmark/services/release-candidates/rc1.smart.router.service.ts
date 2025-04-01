import BigNumber from 'bignumber.js';
import { PairModel } from 'src/modules/pair/models/pair.model';
import { getAmountOut } from 'src/modules/pair/pair.utils';
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

interface Pool {
    /** Reserve of the input token for this pool */
    inputReserve: BigNumber;
    /** Reserve of the output token for this pool */
    outputReserve: BigNumber;
    /** Trading fee (e.g., 0.003 for 0.3% fee) */
    fee: BigNumber;
}

export class RC1SmartRouterService {
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

        // TODO : If chosen routes has a single item, allocate all input and return

        // --------------------------
        // 5) Use parallel Lagrange-like aggregator on chosenRoutes
        // (no shared pools => no iterative reserve updates needed)
        // --------------------------
        // Solve for lambda so that sum of x_i = totalIn
        // exclude negative or negligible allocations

        const uniqueRoutes = chosenRoutes.map((route) => route.path);

        return this.computeAllocationsWithLagrangeFixedInput(
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
     * Compute optimal allocations using Lagrange Multiplier method (fixed input)
     */
    private computeAllocationsWithLagrangeFixedInput(
        paths: string[][],
        pairs: PairModel[],
        amount: string,
    ): {
        allocations: ParallelRouteAllocation[];
        totalResult: string;
    } {
        const totalAmount = new BigNumber(amount);

        // Calculate parameters for each path (alpha, beta, epsilon)
        const pathParams = paths.map((path) =>
            this.calculatePathParameters(path, pairs),
        );

        console.log(paths);

        // for (const [index, params] of pathParams.entries()) {
        //     console.log(paths[index].map((p) => p.split('-')[0]).join('-'), {
        //         alpha: params.alpha.toFixed(),
        //         beta: params.beta.toFixed(),
        //         epsilon: params.epsilon.toFixed(),
        //     });
        // }

        // Find optimal phi value
        const phi = this.findOptimalPhi(pathParams, totalAmount);

        // Calculate allocations for each path using phi
        const rawAllocations: { path: string[]; amount: BigNumber }[] = [];
        let totalAllocated = new BigNumber(0);

        for (let i = 0; i < paths.length; i++) {
            const { alpha, beta, epsilon } = pathParams[i];
            const allocation = this.calculateAllocation(
                alpha,
                beta,
                epsilon,
                phi,
            );

            if (allocation.isGreaterThan(0)) {
                rawAllocations.push({
                    path: paths[i],
                    amount: allocation,
                });
                totalAllocated = totalAllocated.plus(allocation);
            }
        }

        // Normalize allocations to match exactly the total amount
        const normalization = totalAmount.dividedBy(totalAllocated);

        // Multiply each route's share by normalization
        const routeShares = rawAllocations.map((r) =>
            r.amount.multipliedBy(normalization),
        );

        // Convert to floor integer for all but the last route, so we keep the total exact
        let sumSoFar = new BigNumber(0);
        const finalRouteAllocations = new Array(routeShares.length).fill(
            new BigNumber(0),
        );

        for (let i = 0; i < routeShares.length - 1; i++) {
            const floored = routeShares[i].integerValue(BigNumber.ROUND_DOWN);
            finalRouteAllocations[i] = floored;
            sumSoFar = sumSoFar.plus(floored);
        }

        // Last route uses up any remainder
        const remainder = totalAmount.minus(sumSoFar);
        if (remainder.isNegative()) {
            throw new Error('Remainder negative: mismatch in rounding logic');
        }
        finalRouteAllocations[routeShares.length - 1] = remainder;

        // 5) Compute final route results
        const allocations: ParallelRouteAllocation[] = [];
        let totalOutput = new BigNumber(0);

        for (let i = 0; i < rawAllocations.length; i++) {
            const inputBN = finalRouteAllocations[i];
            if (inputBN.isZero()) {
                // skip route
                continue;
            }
            const path = rawAllocations[i].path;
            const interAmts = this.computeIntermediaryAmountsFixedInput(
                path,
                pairs,
                inputBN.toFixed(),
            );
            const out = new BigNumber(interAmts[interAmts.length - 1]);

            allocations.push({
                tokenRoute: path,
                addressRoute: getAddressRoute(pairs, path),
                inputAmount: inputBN.toFixed(),
                outputAmount: out.toFixed(),
                intermediaryAmounts: interAmts,
            });

            totalOutput = totalOutput.plus(out);
        }

        // Calculate final allocations and result
        /*  const routeAllocations: ParallelRouteAllocation[] = [];
        let totalOutput = new BigNumber(0);

        for (const allocation of allocations) {
            const adjustedInput =
                allocation.amount.multipliedBy(normalizationFactor);
            const inputAmountStr = adjustedInput.integerValue().toFixed();

            const intermediaryAmounts =
                this.computeIntermediaryAmountsFixedInput(
                    allocation.path,
                    pairs,
                    inputAmountStr,
                );

            const outputAmount =
                intermediaryAmounts[intermediaryAmounts.length - 1];

            routeAllocations.push({
                tokenRoute: allocation.path,
                addressRoute: getAddressRoute(pairs, allocation.path),
                inputAmount: inputAmountStr,
                outputAmount,
                intermediaryAmounts,
            });

            totalOutput = totalOutput.plus(outputAmount);
        }*/

        return {
            allocations,
            totalResult: totalOutput.toFixed(),
        };
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

    /**
     * Calculate alpha, beta, epsilon parameters for a path
     */
    private calculatePathParameters(
        path: string[],
        pairs: PairModel[],
    ): { alpha: BigNumber; beta: BigNumber; epsilon: BigNumber } {
        const pools: Pool[] = [];

        for (let i = 0; i < path.length - 1; i++) {
            const tokenIn = path[i];
            const tokenOut = path[i + 1];
            const pair = getPairByTokens(pairs, tokenIn, tokenOut);

            if (!pair) {
                throw new Error(
                    `Pool not found for path segment ${tokenIn}-${tokenOut}`,
                );
            }

            const [reserves0, reserves1] = getOrderedReserves(tokenIn, pair);

            pools.push({
                inputReserve: new BigNumber(reserves0),
                outputReserve: new BigNumber(reserves1),
                fee: new BigNumber(pair.totalFeePercent),
            });
        }

        return this.calculateRouteParameters(pools);

        // if (path.length === 2) {
        //     // Single hop route
        //     const tokenIn = path[0];
        //     const tokenOut = path[1];
        //     const pair = getPairByTokens(pairs, tokenIn, tokenOut);

        //     if (!pair) {
        //         throw new Error(
        //             `Pool not found for path ${tokenIn}-${tokenOut}`,
        //         );
        //     }

        //     const [reserves0, reserves1] = getOrderedReserves(tokenIn, pair);
        //     const r0 = new BigNumber(reserves0);
        //     const r1 = new BigNumber(reserves1);
        //     const gamma = new BigNumber(1).minus(pair.totalFeePercent);

        //     // For single-hop: α = a·b·γ, β = a, ε = γ
        //     return {
        //         alpha: r0.multipliedBy(r1).multipliedBy(gamma),
        //         beta: r0,
        //         epsilon: gamma,
        //     };
        // } else {
        //     // Multi-hop route
        //     // This is a simplified approximation for multi-hop paths
        //     let alpha = new BigNumber(1);
        //     let beta = new BigNumber(0);
        //     let epsilon = new BigNumber(1);
        //     for (let i = 0; i < path.length - 1; i++) {
        //         const tokenIn = path[i];
        //         const tokenOut = path[i + 1];
        //         const pair = getPairByTokens(pairs, tokenIn, tokenOut);

        //         if (!pair) {
        //             throw new Error(
        //                 `Pool not found for path segment ${tokenIn}-${tokenOut}`,
        //             );
        //         }

        //         const [reserves0, reserves1] = getOrderedReserves(
        //             tokenIn,
        //             pair,
        //         );
        //         const r0 = new BigNumber(reserves0);
        //         const r1 = new BigNumber(reserves1);
        //         const gamma = new BigNumber(1).minus(pair.totalFeePercent);

        //         if (i === 0) {
        //             // First hop
        //             alpha = r0.multipliedBy(r1).multipliedBy(gamma);
        //             beta = r0;
        //             epsilon = gamma;
        //         } else {
        //             // Subsequent hops - approximation for multi-hop
        //             alpha = alpha.multipliedBy(r1).multipliedBy(gamma);
        //             beta = beta.multipliedBy(r0);
        //             epsilon = epsilon
        //                 .multipliedBy(r0)
        //                 .plus(alpha.multipliedBy(gamma));
        //         }
        //         // if (i === 0) {
        //         //     // First hop
        //         //     alpha = r0.multipliedBy(r1).multipliedBy(gamma);
        //         //     beta = r0;
        //         //     epsilon = gamma;
        //         // } else {
        //         //     // Subsequent hops - approximation for multi-hop
        //         //     alpha = alpha.multipliedBy(r1).multipliedBy(gamma);
        //         //     epsilon = epsilon.multipliedBy(gamma);
        //         // }
        //     }

        //     return { alpha, beta, epsilon };
        // }
    }

    private calculateRouteParameters(pools: Pool[]): {
        alpha: BigNumber;
        beta: BigNumber;
        epsilon: BigNumber;
    } {
        // Calculate gamma values (1 - fee) for each pool
        const gammas = pools.map((pool) => new BigNumber(1).minus(pool.fee));

        // Calculate alfa (product of all reserves and gammas)
        let alfa = new BigNumber(1);
        for (let i = 0; i < pools.length; i++) {
            // For each pool, multiply by both reserves and its gamma
            alfa = alfa
                .times(pools[i].inputReserve)
                .times(pools[i].outputReserve)
                .times(gammas[i]);
        }

        // Calculate beta based on route length
        let beta: BigNumber;

        switch (pools.length) {
            case 1:
                // Single-hop: beta = input reserve
                beta = pools[0].inputReserve;
                break;
            case 2:
                // Double-hop: beta = a1 * c1
                beta = pools[0].inputReserve.times(pools[0].outputReserve);
                break;
            case 3:
                // Triple-hop: beta = a1 * c1 * c2
                beta = pools[0].inputReserve
                    .times(pools[0].outputReserve)
                    .times(pools[1].inputReserve);
                break;
            case 4:
                // Quadruple-hop: beta = a1 * c1 * c2 * c3
                beta = pools[0].inputReserve
                    .times(pools[0].outputReserve)
                    .times(pools[1].inputReserve)
                    .times(pools[1].outputReserve);
                break;
        }

        // Calculate epsilon based on hop count
        let epsilon: BigNumber;

        switch (pools.length) {
            case 1:
                // Single-hop: epsilon = gamma
                epsilon = gammas[0];
                break;

            case 2:
                // Double-hop: epsilon = c2*γ1 + c1*γ1*γ2
                epsilon = pools[1].inputReserve
                    .times(gammas[0])
                    .plus(
                        pools[0].outputReserve
                            .times(gammas[0])
                            .times(gammas[1]),
                    );
                break;

            case 3:
                // Triple-hop formula following the pattern from the paper
                // Term 1: c2*c3*γ1*γ2
                const term1 = pools[1].inputReserve
                    .times(pools[2].inputReserve)
                    .times(gammas[0])
                    .times(gammas[1]);

                // Term 2: c1*c3*γ1*γ2*γ3
                const term2 = pools[0].outputReserve
                    .times(pools[2].inputReserve)
                    .times(gammas[0])
                    .times(gammas[1])
                    .times(gammas[2]);

                // Term 3: c1*c2*γ1*γ2*γ3
                const term3 = pools[0].outputReserve
                    .times(pools[1].outputReserve)
                    .times(gammas[0])
                    .times(gammas[1])
                    .times(gammas[2]);

                epsilon = term1.plus(term2).plus(term3);
                break;

            case 4:
                // Quadruple-hop formula extending the pattern
                // Term 1: c2*c3*c4*γ1*γ2*γ3
                const term4_1 = pools[1].inputReserve
                    .times(pools[2].inputReserve)
                    .times(pools[3].inputReserve)
                    .times(gammas[0])
                    .times(gammas[1])
                    .times(gammas[2]);

                // Term 2: c1*c3*c4*γ1*γ2*γ3*γ4
                const term4_2 = pools[0].outputReserve
                    .times(pools[2].inputReserve)
                    .times(pools[3].inputReserve)
                    .times(gammas[0])
                    .times(gammas[1])
                    .times(gammas[2])
                    .times(gammas[3]);

                // Term 3: c1*c2*c4*γ1*γ2*γ3*γ4
                const term4_3 = pools[0].outputReserve
                    .times(pools[1].outputReserve)
                    .times(pools[3].inputReserve)
                    .times(gammas[0])
                    .times(gammas[1])
                    .times(gammas[2])
                    .times(gammas[3]);

                // Term 4: c1*c2*c3*γ1*γ2*γ3*γ4
                const term4_4 = pools[0].outputReserve
                    .times(pools[1].outputReserve)
                    .times(pools[2].outputReserve)
                    .times(gammas[0])
                    .times(gammas[1])
                    .times(gammas[2])
                    .times(gammas[3]);

                epsilon = term4_1.plus(term4_2).plus(term4_3).plus(term4_4);
                break;
        }

        return { alpha: alfa, beta, epsilon };
    }

    /**
     * Calculate allocation for a path using phi
     */
    private calculateAllocation(
        alpha: BigNumber,
        beta: BigNumber,
        epsilon: BigNumber,
        phi: BigNumber,
    ): BigNumber {
        // ∆ai = (φ·√αi - βi) / εi
        const sqrtAlpha = alpha.sqrt();
        const phiSqrtAlpha = phi.multipliedBy(sqrtAlpha);

        if (phiSqrtAlpha.lte(beta)) {
            return new BigNumber(0);
        }

        return phiSqrtAlpha.minus(beta).dividedBy(epsilon);
    }

    /**
     * Find optimal phi value for Lagrange multiplier method
     */
    private findOptimalPhiOld(
        pathParams: Array<{
            alpha: BigNumber;
            beta: BigNumber;
            epsilon: BigNumber;
        }>,
        totalAmount: BigNumber,
    ): BigNumber {
        // Initial phi calculation
        let numerator = totalAmount;
        let denominator = new BigNumber(0);

        for (const { alpha, beta, epsilon } of pathParams) {
            numerator = numerator.plus(beta.dividedBy(epsilon));
            denominator = denominator.plus(alpha.sqrt().dividedBy(epsilon));
        }

        let phi = numerator.dividedBy(denominator);

        // Adjust phi if any allocations are negative
        const validPaths = Array(pathParams.length).fill(true);
        let hasInvalidAllocations = true;

        while (hasInvalidAllocations) {
            hasInvalidAllocations = false;

            for (let i = 0; i < pathParams.length; i++) {
                if (validPaths[i]) {
                    const allocation = this.calculateAllocation(
                        pathParams[i].alpha,
                        pathParams[i].beta,
                        pathParams[i].epsilon,
                        phi,
                    );

                    if (allocation.isLessThanOrEqualTo(0)) {
                        validPaths[i] = false;
                        hasInvalidAllocations = true;
                    }
                }
            }

            if (hasInvalidAllocations) {
                // Recalculate phi with only valid paths
                numerator = totalAmount;
                denominator = new BigNumber(0);

                for (let i = 0; i < pathParams.length; i++) {
                    if (validPaths[i]) {
                        const { alpha, beta, epsilon } = pathParams[i];
                        numerator = numerator.plus(beta.dividedBy(epsilon));
                        denominator = denominator.plus(
                            alpha.sqrt().dividedBy(epsilon),
                        );
                    }
                }

                phi = numerator.dividedBy(denominator);
            }
        }

        return phi;
        // return phi.integerValue();
    }

    /**
     * Solve for phi via the condition sum(x_i) = totalAmount. We do:
     *
     *   totalAmount = ∑  [ (phi*√αi - βi) / εi ],  over all i.
     *
     * Rearranged, if all routes are included, we can do a direct iteration or a closed-form guess.
     * Here, we do a Newton / simple iteration approach for speed.
     */
    private findOptimalPhi(
        params: Array<{
            alpha: BigNumber;
            beta: BigNumber;
            epsilon: BigNumber;
        }>,
        totalAmount: BigNumber,
    ): BigNumber {
        if (params.length === 0) {
            return new BigNumber(0);
        }

        // A simple approach is to do a monotonic search or Newton iteration for phi > 0.
        // Because the sum of x_i is an increasing function of phi, we can do a simple bisection
        // or a quick approximate formula. We’ll do a mild iteration below.

        // 1) We can guess an initial phi from:
        //    sum( (phi*√αi - βi)/εi ) = total
        // Roughly, if φ >> all βi/√αi, sum x_i ~ φ * ∑(√αi / εi).
        // So a starting guess can be: phi0 = total / ∑(√αi / εi).
        let denom = new BigNumber(0);
        for (const p of params) {
            const sqrtAlpha = p.alpha.sqrt();
            denom = denom.plus(sqrtAlpha.div(p.epsilon));
        }
        if (denom.isZero()) {
            // fallback
            return new BigNumber(0);
        }
        const phi = totalAmount.div(denom);

        // We'll do a few iterations of bisection or newton:
        let lower = new BigNumber(0);
        let upper = phi.multipliedBy(10).plus(10000); // some large upper

        const sumAlloc = (testPhi: BigNumber) => {
            let s = new BigNumber(0);
            for (const { alpha, beta, epsilon } of params) {
                const sqrtA = alpha.sqrt();
                const top = testPhi.times(sqrtA).minus(beta);
                if (top.gt(0)) {
                    s = s.plus(top.div(epsilon));
                }
            }
            return s;
        };

        // Bisection loop
        for (let iter = 0; iter < 40; iter++) {
            const mid = lower.plus(upper).div(2);
            const val = sumAlloc(mid);
            if (val.gt(totalAmount)) {
                // reduce
                upper = mid;
            } else {
                lower = mid;
            }
        }
        return lower.plus(upper).div(2);
    }
}
