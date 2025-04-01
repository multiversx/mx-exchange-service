import BigNumber from 'bignumber.js';
import { PairModel } from 'src/modules/pair/models/pair.model';
import { SWAP_TYPE } from 'src/modules/auto-router/models/auto-route.model';
import { ParallelRouteAllocation } from '../../models/models';
import {
    computeIntermediaryAmountsFixedInput,
    computeRouteOutputFixedIn,
    getAddressRoute,
    getOrderedReserves,
    getPairByTokens,
} from '../../router.utils';

/**
 * Represents a path with precomputed output if 100% of user input is allocated.
 */
interface RouteCandidate {
    path: string[];
    poolsUsed: string[]; // addresses of PairModel
    singleRouteOutput: BigNumber; // final tokenOut if 100% of user input goes here
}

/**
 * Basic typed pool data used for alpha-beta-epsilon calculations.
 */
interface Pool {
    inputReserve: BigNumber; // The relevant reserve for the input token in this hop
    outputReserve: BigNumber; // The relevant reserve for the output token in this hop
    fee: BigNumber; // E.g., 0.003 for a 0.3% swap fee
}

/**
 * Route parameters used for Lagrange optimization.
 */
interface RouteParameters {
    alpha: BigNumber;
    beta: BigNumber;
    epsilon: BigNumber;
}

/**
 * Smart Router that computes optimal splits across multiple paths using Lagrange multipliers.
 * Supports up to 4-hop routes for maximum capital efficiency.
 */
export class RC4SmartRouterService {
    /**
     * Given candidate paths and pairs, split the user input across the best non-conflicting routes
     * and produce final allocations. The final step uses a Lagrange-multiplier aggregator that
     * handles up to 4-hop routes correctly.
     *
     * @param paths All possible token paths to consider
     * @param pairs All available liquidity pools
     * @param amount Amount of input token to swap
     * @param swapType Type of swap (fixed input or fixed output)
     * @returns Optimal route allocations and total expected output
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
        if (swapType === SWAP_TYPE.fixedOutput) {
            throw new Error('Fixed output method not implemented');
        }

        // Validate input
        const totalInBN = new BigNumber(amount);
        if (totalInBN.isZero()) {
            throw new Error('Total input amount cannot be zero');
        }

        // 1. Find viable routes by evaluating each path with 100% of the input
        const viableCandidates = this.findViableRoutes(paths, pairs, totalInBN);
        if (viableCandidates.length === 0) {
            throw new Error(
                `All candidate routes produce zero output for input = ${totalInBN}`,
            );
        }

        // 2. Build route conflict graph (routes share a pool => conflict)
        const conflictGraph = this.buildConflictGraph(viableCandidates);

        // 3. Group conflicting routes and select the best one from each group
        const chosenRoutes = this.selectBestRoutesFromGroups(
            viableCandidates,
            conflictGraph,
        );

        if (chosenRoutes.length === 0) {
            throw new Error('No non-conflicting routes found');
        }

        // 4. If there's only one route chosen, just allocate everything to it
        if (chosenRoutes.length === 1) {
            return this.createSingleRouteAllocation(
                chosenRoutes[0],
                pairs,
                totalInBN,
            );
        }

        // 5. Use Lagrange multipliers to find optimal allocations across routes
        return this.computeOptimalAllocations(
            chosenRoutes.map((route) => route.path),
            pairs,
            amount,
        );
    }

    /**
     * Evaluate each path with 100% of the input to find viable routes.
     */
    private findViableRoutes(
        paths: string[][],
        pairs: PairModel[],
        totalInput: BigNumber,
    ): RouteCandidate[] {
        // Build route candidates
        const allCandidates: RouteCandidate[] = paths.map((path) => {
            const poolsUsed = this.getPoolsUsedByPath(path, pairs);
            const routeOutput = computeRouteOutputFixedIn(
                path,
                pairs,
                totalInput,
            );
            return {
                path,
                poolsUsed,
                singleRouteOutput: routeOutput,
            };
        });

        // Filter out routes that yield 0 output
        return allCandidates.filter((rc) => rc.singleRouteOutput.gt(0));
    }

    /**
     * Build a graph where routes are connected if they share at least one pool.
     * Returns an adjacency list representation.
     */
    private buildConflictGraph(routes: RouteCandidate[]): number[][] {
        const adjList: number[][] = new Array(routes.length)
            .fill(null)
            .map(() => []);

        for (let i = 0; i < routes.length; i++) {
            for (let j = i + 1; j < routes.length; j++) {
                if (this.routesSharePool(routes[i], routes[j])) {
                    adjList[i].push(j);
                    adjList[j].push(i);
                }
            }
        }

        return adjList;
    }

    /**
     * Group conflicting routes and select the best route from each group.
     * Uses connected components algorithm to identify groups.
     */
    private selectBestRoutesFromGroups(
        routes: RouteCandidate[],
        conflictGraph: number[][],
    ): RouteCandidate[] {
        // Find connected components (groups of conflicting routes)
        const visited = new Array(routes.length).fill(false);
        const groups: number[][] = [];

        for (let i = 0; i < routes.length; i++) {
            if (!visited[i]) {
                const component: number[] = [];
                const stack = [i];
                visited[i] = true;

                while (stack.length > 0) {
                    const curr = stack.pop() as number;
                    component.push(curr);

                    for (const nbr of conflictGraph[curr]) {
                        if (!visited[nbr]) {
                            visited[nbr] = true;
                            stack.push(nbr);
                        }
                    }
                }

                groups.push(component);
            }
        }

        // Select the best route from each group
        const chosenRoutes: RouteCandidate[] = [];

        for (const group of groups) {
            let bestRoute: RouteCandidate | null = null;
            let bestOutput = new BigNumber(0);

            for (const idx of group) {
                const candidate = routes[idx];
                if (candidate.singleRouteOutput.gt(bestOutput)) {
                    bestOutput = candidate.singleRouteOutput;
                    bestRoute = candidate;
                }
            }

            if (bestRoute) {
                chosenRoutes.push(bestRoute);
            }
        }

        return chosenRoutes;
    }

    /**
     * Create allocation data for a single route (when only one route is selected).
     */
    private createSingleRouteAllocation(
        route: RouteCandidate,
        pairs: PairModel[],
        totalInput: BigNumber,
    ): {
        allocations: ParallelRouteAllocation[];
        totalResult: string;
    } {
        const path = route.path;
        const intermediaryAmounts = computeIntermediaryAmountsFixedInput(
            path,
            pairs,
            totalInput.toFixed(),
        );
        const outputAmount =
            intermediaryAmounts[intermediaryAmounts.length - 1];

        return {
            allocations: [
                {
                    tokenRoute: path,
                    addressRoute: getAddressRoute(pairs, path),
                    inputAmount: totalInput.toFixed(),
                    outputAmount,
                    intermediaryAmounts,
                },
            ],
            totalResult: outputAmount,
        };
    }

    /**
     * Compute optimal allocations across multiple non-conflicting routes using
     * Lagrange multipliers approach.
     */
    private computeOptimalAllocations(
        paths: string[][],
        pairs: PairModel[],
        amount: string,
    ): {
        allocations: ParallelRouteAllocation[];
        totalResult: string;
    } {
        const totalAmount = new BigNumber(amount);

        // 1. Calculate alpha, beta, epsilon parameters for each route
        const pathParams = paths.map((path) =>
            this.calculatePathParameters(path, pairs),
        );

        // 2. Solve for the optimal phi multiplier
        let phi = this.findOptimalPhi(pathParams, totalAmount);

        // 3. Identify valid routes (routes that receive positive allocation)
        const validMask = new Array(pathParams.length).fill(true);
        let done = false;

        while (!done) {
            done = true;
            for (let i = 0; i < pathParams.length; i++) {
                if (!validMask[i]) continue;

                const { alpha, beta, epsilon } = pathParams[i];
                const allocation = this.calculateAllocation(
                    alpha,
                    beta,
                    epsilon,
                    phi,
                );

                if (allocation.lte(0)) {
                    validMask[i] = false;
                    done = false;
                }
            }

            if (!done) {
                // Recompute phi with only valid routes
                phi = this.findOptimalPhi(
                    pathParams.filter((_, idx) => validMask[idx]),
                    totalAmount,
                );
            }
        }

        // 4. Calculate raw allocations for each valid route
        const rawAllocations: Array<{ path: string[]; allocation: BigNumber }> =
            [];
        let sumAllocations = new BigNumber(0);

        for (let i = 0; i < pathParams.length; i++) {
            if (!validMask[i]) continue;

            const { alpha, beta, epsilon } = pathParams[i];
            const allocation = this.calculateAllocation(
                alpha,
                beta,
                epsilon,
                phi,
            );

            if (allocation.gt(0)) {
                rawAllocations.push({ path: paths[i], allocation });
                sumAllocations = sumAllocations.plus(allocation);
            }
        }

        // 5. Handle edge case: all allocations are zero
        if (sumAllocations.isZero()) {
            return this.fallbackToSingleBestRoute(paths, pairs, totalAmount);
        }

        // 6. Normalize allocations to sum exactly to the total input amount
        const finalAllocations = this.normalizeAllocations(
            rawAllocations,
            totalAmount,
            sumAllocations,
        );

        // 7. Compute final route results
        return this.computeFinalAllocations(
            rawAllocations,
            finalAllocations,
            pairs,
        );
    }

    /**
     * Fallback to the single best route when optimization fails.
     */
    private fallbackToSingleBestRoute(
        paths: string[][],
        pairs: PairModel[],
        totalAmount: BigNumber,
    ): {
        allocations: ParallelRouteAllocation[];
        totalResult: string;
    } {
        // Find the route with the best output if all input goes there
        let bestIdx = 0;
        let bestOutput = new BigNumber(0);

        for (let i = 0; i < paths.length; i++) {
            const output = computeRouteOutputFixedIn(
                paths[i],
                pairs,
                totalAmount,
            );

            if (output.gt(bestOutput)) {
                bestOutput = output;
                bestIdx = i;
            }
        }

        const path = paths[bestIdx];
        const intermediaryAmounts = computeIntermediaryAmountsFixedInput(
            path,
            pairs,
            totalAmount.toFixed(),
        );

        return {
            allocations: [
                {
                    tokenRoute: path,
                    addressRoute: getAddressRoute(pairs, path),
                    inputAmount: totalAmount.toFixed(),
                    outputAmount:
                        intermediaryAmounts[intermediaryAmounts.length - 1],
                    intermediaryAmounts,
                },
            ],
            totalResult: intermediaryAmounts[intermediaryAmounts.length - 1],
        };
    }

    /**
     * Normalize raw allocations to sum exactly to the total input amount.
     * Ensures proper rounding to avoid dust amounts.
     */
    private normalizeAllocations(
        rawAllocations: Array<{ path: string[]; allocation: BigNumber }>,
        totalAmount: BigNumber,
        sumAllocations: BigNumber,
    ): BigNumber[] {
        // Compute normalization factor
        const normalizationFactor = totalAmount.div(sumAllocations);

        // Multiply each route's allocation by normalization factor
        const routeShares = rawAllocations.map((r) =>
            r.allocation.multipliedBy(normalizationFactor),
        );

        // Ensure allocations sum exactly to totalAmount (handle rounding)
        let sumSoFar = new BigNumber(0);
        const finalAllocations = new Array(routeShares.length).fill(
            new BigNumber(0),
        );

        // Floor all but the last allocation
        for (let i = 0; i < routeShares.length - 1; i++) {
            const flooredAmount = routeShares[i].integerValue(
                BigNumber.ROUND_DOWN,
            );
            finalAllocations[i] = flooredAmount;
            sumSoFar = sumSoFar.plus(flooredAmount);
        }

        // Last allocation gets the remainder
        const remainder = totalAmount.minus(sumSoFar);
        if (remainder.isNegative()) {
            throw new Error('Remainder negative: mismatch in rounding logic');
        }

        finalAllocations[routeShares.length - 1] = remainder;

        return finalAllocations;
    }

    /**
     * Compute final allocations and total output based on normalized allocations.
     */
    private computeFinalAllocations(
        rawAllocations: Array<{ path: string[]; allocation: BigNumber }>,
        finalAllocations: BigNumber[],
        pairs: PairModel[],
    ): {
        allocations: ParallelRouteAllocation[];
        totalResult: string;
    } {
        const allocations: ParallelRouteAllocation[] = [];
        let totalOutput = new BigNumber(0);

        for (let i = 0; i < rawAllocations.length; i++) {
            const inputAmount = finalAllocations[i];

            // Skip routes with zero allocation
            if (inputAmount.isZero()) {
                continue;
            }

            const path = rawAllocations[i].path;
            const intermediaryAmounts = computeIntermediaryAmountsFixedInput(
                path,
                pairs,
                inputAmount.toFixed(),
            );

            const outputAmount = new BigNumber(
                intermediaryAmounts[intermediaryAmounts.length - 1],
            );

            allocations.push({
                tokenRoute: path,
                addressRoute: getAddressRoute(pairs, path),
                inputAmount: inputAmount.toFixed(),
                outputAmount: outputAmount.toFixed(),
                intermediaryAmounts,
            });

            totalOutput = totalOutput.plus(outputAmount);
        }

        return {
            allocations,
            totalResult: totalOutput.toFixed(),
        };
    }

    // ----------------------------------------------------------------------
    // ROUTING HELPERS
    // ----------------------------------------------------------------------

    /**
     * Check if two routes share any pool.
     */
    private routesSharePool(a: RouteCandidate, b: RouteCandidate): boolean {
        const poolSet = new Set(a.poolsUsed);
        return b.poolsUsed.some((poolAddr) => poolSet.has(poolAddr));
    }

    /**
     * Get the pool addresses used by a path.
     */
    private getPoolsUsedByPath(path: string[], pairs: PairModel[]): string[] {
        const poolAddresses: string[] = [];

        for (let i = 0; i < path.length - 1; i++) {
            const pair = getPairByTokens(pairs, path[i], path[i + 1]);
            if (pair) {
                poolAddresses.push(pair.address);
            }
        }

        return poolAddresses;
    }

    // ----------------------------------------------------------------------
    // LAGRANGE OPTIMIZATION
    // ----------------------------------------------------------------------

    /**
     * Calculate path parameters (alpha, beta, epsilon) for Lagrange optimization.
     * These parameters model the marginal price impact of a route.
     */
    private calculatePathParameters(
        path: string[],
        pairs: PairModel[],
    ): RouteParameters {
        if (path.length < 2 || path.length > 5) {
            // Path with n tokens has (n-1) pools, so "up to 4 hops" means up to 5 tokens
            throw new Error(`Unsupported path length: ${path.length}`);
        }

        // Convert path to Pool objects with reserves and fees
        const pools: Pool[] = [];

        for (let i = 0; i < path.length - 1; i++) {
            const tokenIn = path[i];
            const tokenOut = path[i + 1];
            const pair = getPairByTokens(pairs, tokenIn, tokenOut);

            if (!pair) {
                throw new Error(
                    `Missing pair for hop ${tokenIn} -> ${tokenOut}`,
                );
            }

            const [resIn, resOut] = getOrderedReserves(tokenIn, pair);
            pools.push({
                inputReserve: new BigNumber(resIn),
                outputReserve: new BigNumber(resOut),
                fee: new BigNumber(pair.totalFeePercent),
            });
        }

        return this.calculateRouteParameters(pools);
    }

    /**
     * Calculate route parameters based on pools.
     * This compact implementation handles all hop counts (1-4) using a generalized approach.
     *
     * The formula models -> d(output)/d(x) = alpha / [(beta + epsilon * x)^2]
     * For routes with n hops:
     * - alpha: product of all input reserves, output reserves, and (1-fee) factors
     * - beta: product of all input reserves
     * - epsilon: sum of n terms with specific patterns
     */
    private calculateRouteParameters(pools: Pool[]): RouteParameters {
        const n = pools.length;

        if (n < 1 || n > 4) {
            throw new Error(`Route has unsupported number of hops = ${n}`);
        }

        // Extract arrays of values
        const a: BigNumber[] = pools.map((p) => p.inputReserve);
        const b: BigNumber[] = pools.map((p) => p.outputReserve);
        const gamma: BigNumber[] = pools.map((p) =>
            new BigNumber(1).minus(p.fee),
        );

        // Calculate alpha (product of all reserves and gammas)
        let alpha = new BigNumber(1);
        for (let i = 0; i < n; i++) {
            alpha = alpha.times(a[i]).times(b[i]).times(gamma[i]);
        }

        // Calculate beta (product of input reserves)
        let beta = new BigNumber(1);
        for (let i = 0; i < n; i++) {
            beta = beta.times(a[i]);
        }

        // Calculate epsilon (sum of terms)
        let epsilon: BigNumber;

        if (n === 1) {
            // Single hop: epsilon = gamma[0]
            epsilon = gamma[0];
        } else {
            // Multi-hop: epsilon is sum of n terms
            epsilon = new BigNumber(0);

            // For each term index i
            for (let i = 0; i < n; i++) {
                let term = new BigNumber(1);

                // First part: product of b[0]...b[i-1] (if any)
                for (let j = 0; j < i; j++) {
                    term = term.times(b[j]);
                }

                // Second part: product of a[i+1]...a[n-1] (if any)
                for (let j = i + 1; j < n; j++) {
                    term = term.times(a[j]);
                }

                // Third part: product of gamma[0]...gamma[min(i+1,n-1)]
                for (let j = 0; j <= Math.min(i + 1, n - 1); j++) {
                    term = term.times(gamma[j]);
                }

                epsilon = epsilon.plus(term);
            }
        }

        return { alpha, beta, epsilon };
    }

    private calculateRouteParametersAlternative(pools: Pool[]): {
        alpha: BigNumber;
        beta: BigNumber;
        epsilon: BigNumber;
    } {
        const n = pools.length;
        if (n < 1 || n > 4) {
            throw new Error(`Route has unsupported number of hops = ${n}`);
        }

        // Collect gammas, a_i, b_i
        const a: BigNumber[] = [];
        const b: BigNumber[] = [];
        const gamma: BigNumber[] = [];

        for (const p of pools) {
            a.push(p.inputReserve);
            b.push(p.outputReserve);
            gamma.push(new BigNumber(1).minus(p.fee));
        }

        // For convenience:
        // Single-hop:
        //   output(∆x) = (∆x * b1 * γ1) / (a1 + ∆x * γ1)
        //   => derivative wrt x => alpha / [beta + epsilon*x]^2
        //   => alpha = a1*b1*γ1
        //      beta  = a1
        //      epsilon = γ1
        //
        // Double-hop ( a->c->b ):
        //   => derivative = [ a1 * b1 * a2 * b2 * γ1 * γ2 ] / [ a1*a2 + ∆x( a2*γ1 + b1*γ1*γ2 )]^2
        //   so alpha   = a1*b1 * a2*b2 * γ1*γ2
        //      beta    = a1*a2
        //      epsilon = a2*γ1 + b1*γ1*γ2
        //
        // Triple-hop => from the whitepaper expansions, or you can derive them by chain rule carefully.
        // Quadruple-hop => likewise.

        // We'll do a small case analysis. Another approach is to do
        // a symbolic chain derivative, but enumerating by hand for up to 4 hops
        // is typically simpler and matches the PDF’s expansions.

        if (n === 1) {
            // Single hop
            const alpha = a[0].times(b[0]).times(gamma[0]);
            const beta = a[0];
            const epsilon = gamma[0];
            return { alpha, beta, epsilon };
        } else if (n === 2) {
            // Double hop
            const alpha = a[0]
                .times(b[0])
                .times(a[1])
                .times(b[1])
                .times(gamma[0])
                .times(gamma[1]);
            const beta = a[0].times(a[1]);
            const epsilon = a[1]
                .times(gamma[0])
                .plus(b[0].times(gamma[0]).times(gamma[1]));
            return { alpha, beta, epsilon };
        } else if (n === 3) {
            // Triple hop
            // The partial derivative expansion from the doc yields:
            // alpha = (a1*b1) * (a2*b2) * (a3*b3) * (g1*g2*g3)
            // denominator => [ a1*a2*a3 + ∆x(...) ]^2, but we must collect the right cross-terms in epsilon
            //
            // However the doc’s formula for epsilon is the sum of 3 terms:
            //   (a2*a3*g1*g2) + (b1*a3*g1*g2*g3) + (b1*b2*g1*g2*g3)
            //
            // We just carefully track them:
            const alpha = a[0]
                .times(b[0])
                .times(a[1])
                .times(b[1])
                .times(a[2])
                .times(b[2])
                .times(gamma[0])
                .times(gamma[1])
                .times(gamma[2]);

            // beta => product of the input reserves: a1*a2*a3
            const beta = a[0].times(a[1]).times(a[2]);

            // epsilon => sum of 3 big terms:
            //   (a2*a3*g1*g2) + (b1*a3*g1*g2*g3) + (b1*b2*g1*g2*g3)
            // but we need each term carefully:
            //   1) a2*a3*g1*g2
            //   2) b1*a3*g1*g2*g3
            //   3) b1*b2*g1*g2*g3
            //
            // Actually, we must factor in a[0], b[0], a[1], b[1], a[2], b[2], etc. carefully.
            // The path is a-> mid1 -> mid2 -> b.
            // We'll match the pattern from the 2-hop example, extended one more step.
            // This can be found in the whitepaper’s “Term1, Term2, Term3” for triple hop.
            const term1 = a[1].times(a[2]).times(gamma[0]).times(gamma[1]);
            const term2 = b[0]
                .times(a[2])
                .times(gamma[0])
                .times(gamma[1])
                .times(gamma[2]);
            const term3 = b[0]
                .times(b[1])
                .times(gamma[0])
                .times(gamma[1])
                .times(gamma[2]);

            const epsilon = term1.plus(term2).plus(term3);
            return { alpha, beta, epsilon };
        } else {
            // Quadruple hop (4 pools => 5 tokens)
            // The doc formula has alpha = product of a[i]*b[i]*gamma[i], i=0..3
            //   => alpha = a1*b1*a2*b2*a3*b3*a4*b4*g1*g2*g3*g4
            // For epsilon, the doc pattern yields 4 terms: (like "term4_1 ... term4_4").
            //   1) a2*a3*a4*g1*g2*g3
            //   2) b1*a3*a4*g1*g2*g3*g4
            //   3) b1*b2*a4*g1*g2*g3*g4
            //   4) b1*b2*b3*g1*g2*g3*g4
            // plus the initial partial factor a1??? Actually see below. It's easiest to replicate the expansion from the doc verbatim:

            const alpha = a[0]
                .times(b[0])
                .times(a[1])
                .times(b[1])
                .times(a[2])
                .times(b[2])
                .times(a[3])
                .times(b[3])
                .times(gamma[0])
                .times(gamma[1])
                .times(gamma[2])
                .times(gamma[3]);

            // beta => product of the input reserves: a1*a2*a3*a4
            const beta = a[0].times(a[1]).times(a[2]).times(a[3]);

            // The sum of 4 big terms for epsilon:
            const term1 = a[1]
                .times(a[2])
                .times(a[3])
                .times(gamma[0])
                .times(gamma[1])
                .times(gamma[2]);
            const term2 = b[0]
                .times(a[2])
                .times(a[3])
                .times(gamma[0])
                .times(gamma[1])
                .times(gamma[2])
                .times(gamma[3]);
            const term3 = b[0]
                .times(b[1])
                .times(a[3])
                .times(gamma[0])
                .times(gamma[1])
                .times(gamma[2])
                .times(gamma[3]);
            const term4 = b[0]
                .times(b[1])
                .times(b[2])
                .times(gamma[0])
                .times(gamma[1])
                .times(gamma[2])
                .times(gamma[3]);

            const epsilon = term1.plus(term2).plus(term3).plus(term4);
            return { alpha, beta, epsilon };
        }
    }

    /**
     * Calculate allocation for a route given the Lagrange multiplier phi.
     *
     * For a route i, the allocation is:
     *    x_i = (phi * sqrt(alpha_i) - beta_i) / epsilon_i
     * provided that the result is > 0.
     */
    private calculateAllocation(
        alpha: BigNumber,
        beta: BigNumber,
        epsilon: BigNumber,
        phi: BigNumber,
    ): BigNumber {
        const sqrtAlpha = alpha.sqrt();
        const numerator = phi.multipliedBy(sqrtAlpha).minus(beta);

        if (numerator.lte(0)) {
            return new BigNumber(0);
        }

        return numerator.div(epsilon);
    }

    /**
     * Find the optimal Lagrange multiplier phi such that the sum of allocations
     * equals the total input amount.
     *
     *   totalAmount = ∑  [ (phi*√αi - βi) / εi ],  over all i.
     *
     * Uses binary search to find phi efficiently.
     */
    private findOptimalPhi(
        pathParams: RouteParameters[],
        totalAmount: BigNumber,
    ): BigNumber {
        if (pathParams.length === 0) {
            return new BigNumber(0);
        }

        // Initial guess for phi based on approximation formula :
        //    sum( (phi*√αi - βi)/εi ) = total
        // Roughly, if φ >> all βi/√αi, sum x_i ~ φ * ∑(√αi / εi).
        // So a starting guess can be: phi0 = total / ∑(√αi / εi).
        let denom = new BigNumber(0);
        for (const { alpha, epsilon } of pathParams) {
            const sqrtAlpha = alpha.sqrt();
            denom = denom.plus(sqrtAlpha.div(epsilon));
        }

        if (denom.isZero()) {
            return new BigNumber(0);
        }

        const initialPhi = totalAmount.div(denom);

        // Binary search for phi
        let lower = new BigNumber(0);
        let upper = initialPhi.multipliedBy(2);

        // Calculate sum of allocations for a given phi
        const sumAllocations = (testPhi: BigNumber): BigNumber => {
            let sum = new BigNumber(0);

            for (const { alpha, beta, epsilon } of pathParams) {
                const sqrtAlpha = alpha.sqrt();
                const numerator = testPhi.times(sqrtAlpha).minus(beta);

                if (numerator.gt(0)) {
                    sum = sum.plus(numerator.div(epsilon));
                }
            }

            return sum;
        };

        // Ensure upper bound is high enough
        while (sumAllocations(upper).lte(totalAmount)) {
            upper = upper.multipliedBy(2);
        }

        // Binary search with fixed iterations for predictable performance
        const MAX_ITERATIONS = 50;
        for (let i = 0; i < MAX_ITERATIONS; i++) {
            const mid = lower.plus(upper).div(2);
            const midValue = sumAllocations(mid);

            if (midValue.gt(totalAmount)) {
                upper = mid;
            } else {
                lower = mid;
            }
        }

        return lower.plus(upper).div(2);
    }
}
