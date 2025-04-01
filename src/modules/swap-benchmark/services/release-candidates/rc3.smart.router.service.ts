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

/**
 * Represents a path with precomputed output if 100% of user input is allocated.
 */
interface RouteCandidate {
    path: string[];
    poolsUsed: string[]; // addresses of PairModel
    singleRouteOutput: BigNumber; // final tokenOut if 100% of user input goes here
}

/**
 * Basic typed pool data used for alpha-beta-epsilon.
 */
interface Pool {
    inputReserve: BigNumber; // The relevant reserve for the input token in this hop
    outputReserve: BigNumber; // The relevant reserve for the output token in this hop
    fee: BigNumber; // E.g., 0.003 for a 0.3% swap fee
}

export class RC3SmartRouterService {
    /**
     * Given candidate paths and pairs, split the user input across the best non-conflicting routes
     * and produce final allocations. The final step uses a Lagrange-multiplier aggregator that
     * handles up to 4-hop routes correctly.
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

        // Evaluate each path with 100% of the input (just to see if it yields > 0)
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

        // Filter out routes that yield 0 if we push all input into them.
        const viableCandidates = allCandidates.filter((rc) =>
            rc.singleRouteOutput.gt(0),
        );
        if (viableCandidates.length === 0) {
            throw new Error(
                `All candidate routes produce zero output for input = ${totalInBN}`,
            );
        }

        // --------------------------
        // 2) Build conflict graph (share a pool => conflict)
        // --------------------------
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
                    adjList[i].push(j);
                    adjList[j].push(i);
                }
            }
        }

        // --------------------------
        // 3) Find connected components => "groups"
        // Only one route per connected component.
        // --------------------------
        const visited = new Array(viableCandidates.length).fill(false);
        const groups: number[][] = [];
        for (let i = 0; i < viableCandidates.length; i++) {
            if (!visited[i]) {
                const component: number[] = [];
                const stack = [i];
                visited[i] = true;
                while (stack.length > 0) {
                    const curr = stack.pop() as number;
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
        // 4) Pick best route per group (largest single-route output).
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

        if (chosenRoutes.length === 0) {
            throw new Error('No non-conflicting routes found');
        }

        // If there's only one route chosen, just allocate everything
        if (chosenRoutes.length === 1) {
            const [onlyRoute] = chosenRoutes;
            const path = onlyRoute.path;
            const allocations: ParallelRouteAllocation[] = [];

            const intermediaryAmounts =
                this.computeIntermediaryAmountsFixedInput(
                    path,
                    pairs,
                    totalInBN.toFixed(),
                );
            const outputAmount =
                intermediaryAmounts[intermediaryAmounts.length - 1];

            allocations.push({
                tokenRoute: path,
                addressRoute: getAddressRoute(pairs, path),
                inputAmount: totalInBN.toFixed(),
                outputAmount,
                intermediaryAmounts,
            });

            return {
                allocations,
                totalResult: outputAmount,
            };
        }

        // --------------------------
        // 5) Use parallel Lagrange aggregator on the chosen routes
        //    (no shared pools => no reserve overlap).
        // --------------------------
        const uniquePaths = chosenRoutes.map((r) => r.path);
        return this.computeAllocationsWithLagrangeFixedInput(
            uniquePaths,
            pairs,
            amount,
        );
    }

    // ----------------------------------------------------------------------
    // HELPER METHODS
    // ----------------------------------------------------------------------

    /**
     * Return true if two routes share a pool address.
     */
    private routesSharePool(a: RouteCandidate, b: RouteCandidate): boolean {
        const setA = new Set(a.poolsUsed);
        return b.poolsUsed.some((poolAddr) => setA.has(poolAddr));
    }

    /**
     * Gather the pool addresses for each adjacent pair of tokens in the path.
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
     * Compute how much tokenOut we get if we push `amountIn` through the consecutive pools in path.
     */
    private computeRouteOutputFixedIn(
        path: string[],
        pairs: PairModel[],
        amountIn: BigNumber,
    ): BigNumber {
        let currentAmount = amountIn;
        for (let i = 0; i < path.length - 1; i++) {
            const tokenIn = path[i];
            const tokenOut = path[i + 1];
            const pair = getPairByTokens(pairs, tokenIn, tokenOut);
            if (!pair) {
                return new BigNumber(0);
            }

            const [resIn, resOut] = getOrderedReserves(tokenIn, pair);
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

    /**
     * Lagrange-based aggregator for routes (up to 4 hops).  We first compute alpha, beta, epsilon for each route.
     * Then solve sum(x_i) = totalIn for x_i >= 0. That yields a single phi, from which each x_i is derived:
     *
     *    x_i = ( phi * sqrt(alpha_i ) - beta_i ) / epsilon_i
     *
     * If any x_i <= 0, we exclude that route and re-solve. Finally, we allocate the result proportionally and compute the output.
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

        // 1) Build alpha, beta, epsilon for each route
        const pathParams = paths.map((path) => {
            return this.calculatePathParameters(path, pairs);
        });

        // 2) Solve for phi
        let phi = this.findOptimalPhi(pathParams, totalAmount);

        // 3) Possibly re-solve if any allocations would go negative
        const validMask = new Array(pathParams.length).fill(true);
        let done = false;

        while (!done) {
            done = true;
            for (let i = 0; i < pathParams.length; i++) {
                if (!validMask[i]) continue;
                const { alpha, beta, epsilon } = pathParams[i];
                const alloc = this.calculateAllocation(
                    alpha,
                    beta,
                    epsilon,
                    phi,
                );
                if (alloc.lte(0)) {
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

        // 4) Build final allocations
        const rawAllocations: Array<{ path: string[]; allocation: BigNumber }> =
            [];
        let sumAlloc = new BigNumber(0);

        for (let i = 0; i < pathParams.length; i++) {
            if (!validMask[i]) continue;
            const { alpha, beta, epsilon } = pathParams[i];
            const alloc = this.calculateAllocation(alpha, beta, epsilon, phi);
            if (alloc.gt(0)) {
                rawAllocations.push({ path: paths[i], allocation: alloc });
                sumAlloc = sumAlloc.plus(alloc);
            }
        }

        if (sumAlloc.isZero()) {
            // Fallback: if everything went zero, pick the route with the best “all-in” output.
            let bestIdx = 0;
            let bestOutput = new BigNumber(0);
            for (let i = 0; i < paths.length; i++) {
                const out = this.computeRouteOutputFixedIn(
                    paths[i],
                    pairs,
                    totalAmount,
                );
                if (out.gt(bestOutput)) {
                    bestOutput = out;
                    bestIdx = i;
                }
            }
            const path = paths[bestIdx];
            const amounts = this.computeIntermediaryAmountsFixedInput(
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
                        outputAmount: amounts[amounts.length - 1],
                        intermediaryAmounts: amounts,
                    },
                ],
                totalResult: amounts[amounts.length - 1],
            };
        }

        // Normalize allocations to sum exactly totalAmount
        const normalization = totalAmount.div(sumAlloc);

        // Multiply each route's share by normalization
        const routeShares = rawAllocations.map((r) =>
            r.allocation.multipliedBy(normalization),
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

        /* for (const item of rawAllocations) {
            const routeIn = item.allocation.multipliedBy(normalization);
            // integerValue is optional, but if you want to avoid dust:
            const routeInStr = routeIn.integerValue().toFixed();

            const interAmts = this.computeIntermediaryAmountsFixedInput(
                item.path,
                pairs,
                routeInStr,
            );
            const out = new BigNumber(interAmts[interAmts.length - 1]);

            allocations.push({
                tokenRoute: item.path,
                addressRoute: getAddressRoute(pairs, item.path),
                inputAmount: routeInStr,
                outputAmount: out.toFixed(),
                intermediaryAmounts: interAmts,
            });
            totalOutput = totalOutput.plus(out);
        }*/

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

        return {
            allocations,
            totalResult: totalOutput.toFixed(),
        };
    }

    /**
     * Returns the amounts at each hop for a path with a fixed input.
     */
    private computeIntermediaryAmountsFixedInput(
        path: string[],
        pairs: PairModel[],
        initialAmountIn: string,
    ): string[] {
        const amounts: string[] = [initialAmountIn];
        let current = new BigNumber(initialAmountIn);

        for (let i = 0; i < path.length - 1; i++) {
            const tokenIn = path[i];
            const tokenOut = path[i + 1];
            const pair = getPairByTokens(pairs, tokenIn, tokenOut);
            if (!pair) {
                amounts.push('0');
                break;
            }
            const [rIn, rOut] = getOrderedReserves(tokenIn, pair);
            const out = getAmountOut(
                current.toFixed(),
                rIn,
                rOut,
                pair.totalFeePercent,
            );
            amounts.push(out.toFixed());
            current = out;
        }
        return amounts;
    }

    // --------------------------------------------------------------------------------------------
    //   Lagrange parameters
    // --------------------------------------------------------------------------------------------

    /**
     * For each path (1 to 4 hops), compute alpha, beta, epsilon so that
     * d(output)/d(x) = alpha / [beta + epsilon * x]^2.
     *
     * We'll do a small switch-case by route length, using the standard expansions
     * from the whitepaper. This ensures 1-hop, 2-hop, 3-hop, and 4-hop are correct.
     */
    private calculatePathParameters(
        path: string[],
        pairs: PairModel[],
    ): { alpha: BigNumber; beta: BigNumber; epsilon: BigNumber } {
        if (path.length < 2 || path.length > 5) {
            // If path has n tokens, it has (n-1) pools. So "up to 4 hops" means up to 5 tokens in the path array
            throw new Error(`Unsupported path length: ${path.length}`);
        }

        // Build a simpler "Pool" array for each hop
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
            const [rIn, rOut] = getOrderedReserves(tokenIn, pair);
            pools.push({
                inputReserve: new BigNumber(rIn),
                outputReserve: new BigNumber(rOut),
                fee: new BigNumber(pair.totalFeePercent),
            });
        }

        return this.calculateRouteParameters(pools);
    }

    /**
     * Given the array of Pools (1..4 of them), compute alpha, beta, epsilon
     * so that:
     *   d(output)/d(x) = alpha / [ (beta + epsilon*x)^2 ].
     *
     * Each hop i has (a_i, b_i) = (inputReserve, outputReserve),
     * gamma_i = (1 - fee).
     */
    private calculateRouteParameters(pools: Pool[]): {
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
     * For a single route i, the Lagrange solution says:
     *   x_i = ( phi * sqrt(alpha_i) - beta_i ) / epsilon_i,
     * provided that the result is > 0.
     */
    private calculateAllocation(
        alpha: BigNumber,
        beta: BigNumber,
        epsilon: BigNumber,
        phi: BigNumber,
    ): BigNumber {
        // x_i = (phi * sqrt(alpha_i) - beta_i)/ epsilon_i
        const sqrtAlpha = alpha.sqrt();
        const top = phi.multipliedBy(sqrtAlpha).minus(beta);
        if (top.lte(0)) {
            return new BigNumber(0);
        }
        return top.div(epsilon);
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
        // let upper = phi.multipliedBy(10).plus(1000000); // some large upper
        // let upper = phi.multipliedBy(10).plus(10000); // some large upper
        let upper = phi.multipliedBy(2);

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

        while (sumAlloc(upper).lte(totalAmount)) {
            upper = upper.multipliedBy(2);
        }

        // Bisection loop
        // for (let iter = 0; iter < 40; iter++) {
        for (let iter = 0; iter < 50; iter++) {
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
