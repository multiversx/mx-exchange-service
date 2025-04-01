import BigNumber from 'bignumber.js';
import { PairModel } from 'src/modules/pair/models/pair.model';
import { getAmountOut } from 'src/modules/pair/pair.utils';
import { ParallelRouteAllocation } from '../../models/models';
import { SWAP_TYPE } from 'src/modules/auto-router/models/auto-route.model';

interface RouteCandidate {
    path: string[];
    poolsUsed: string[]; // addresses of PairModel
    singleRouteOutput: BigNumber; // final tokenOut if we push ALL user input

    // For the multi-route aggregator:
    computeOut: (amountIn: BigNumber) => BigNumber;
    derivative: (amountIn: BigNumber) => BigNumber;
}

// export class GroupedMultiRouteSwapService {
export class O1SmartRouterServiceV3 {
    // You can adjust numeric tolerances as desired:
    private static MIN_ALLOC = new BigNumber('1e-18'); // min portion allocated
    private static MAX_ITER = 50; // for binary searches

    /**
     * Returns up to topN route allocations that together maximize final output for the user,
     * ignoring all routes that share a pool (by grouping).
     */
    async computeBestSwapRoute(
        paths: string[][],
        pairs: PairModel[],
        amount: string,
        swapType = SWAP_TYPE.fixedInput,
        topN = 10,
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
            const computeOutFn = (x: BigNumber) =>
                this.computeRouteOutputFixedIn(path, pairs, x);
            return {
                path,
                poolsUsed,
                singleRouteOutput: computeOutFn(totalInBN),
                computeOut: computeOutFn,
                derivative: (x: BigNumber) =>
                    this.numericalDerivative(computeOutFn, x),
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
                if (cand.singleRouteOutput.isGreaterThan(bestOutput)) {
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

        // If chosen routes has a single item, allocate all input and return

        // --------------------------
        // 5) Use parallel Lagrange-like aggregator on chosenRoutes
        //    (none share pools => no iterative reserve updates needed)
        // --------------------------
        // Solve for lambda so that sum of x_i = totalIn
        // exclude negative or negligible allocations
        let finalRoutes = chosenRoutes;
        let done = false;
        while (!done) {
            const lambda = this.solveLambdaForAllocation(
                finalRoutes,
                totalInBN,
            );
            const allocations = finalRoutes.map((r) => {
                const xi = this.findXGivenDerivative(r, lambda, totalInBN);
                return { route: r, x: xi };
            });
            // drop routes that are effectively 0
            const nearZero = allocations.filter((a) =>
                a.x.isLessThan(O1SmartRouterServiceV3.MIN_ALLOC),
            );
            if (nearZero.length > 0 && finalRoutes.length > 1) {
                // remove them and retry
                const nearZeroSet = new Set(nearZero.map((nz) => nz.route));
                finalRoutes = finalRoutes.filter((rt) => !nearZeroSet.has(rt));
            } else {
                done = true;
            }
        }

        // final pass
        const finalLambda = this.solveLambdaForAllocation(
            finalRoutes,
            totalInBN,
        );
        const finalAllocs = finalRoutes.map((r) => {
            const x = this.findXGivenDerivative(r, finalLambda, totalInBN);
            return { route: r, x };
        });

        // --------------------------
        // 6) Build final output
        // --------------------------
        // Sort by finalOut descending
        const resultsUnsorted: ParallelRouteAllocation[] = finalAllocs.map(
            ({ route, x }) => {
                const outBN = route.computeOut(x);
                const addressRoute = this.getAddressRoute(route.path, pairs);
                return {
                    tokenRoute: route.path,
                    inputAmount: x.toFixed(),
                    outputAmount: outBN.toFixed(),
                    intermediaryAmounts: [],
                    addressRoute,
                };
            },
        );
        resultsUnsorted.sort((a, b) =>
            new BigNumber(b.outputAmount).comparedTo(
                new BigNumber(a.outputAmount),
            ),
        );

        const finalAllocations = resultsUnsorted.slice(0, topN);
        const totalResult = finalAllocations.reduce(
            (sum, allocation) => sum.plus(allocation.outputAmount),
            new BigNumber(0),
        );

        // Return topN
        return {
            allocations: resultsUnsorted.slice(0, topN),
            totalResult: totalResult.toFixed(),
        };
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
            const pair = this.getPairByTokens(pairs, path[i], path[i + 1]);
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
            const pair = this.getPairByTokens(pairs, tokenInID, tokenOutID);
            if (!pair) {
                return new BigNumber(0);
            }
            const [resIn, resOut] = this.getOrderedReserves(tokenInID, pair);
            if (resIn.isZero() || resOut.isZero() || currentAmount.isZero()) {
                return new BigNumber(0);
            }
            currentAmount = getAmountOut(
                currentAmount.toFixed(),
                resIn.toFixed(),
                resOut.toFixed(),
                pair.totalFeePercent,
            );
            if (currentAmount.isZero()) {
                return new BigNumber(0);
            }
        }
        return currentAmount;
    }

    /**
     * A quick finite-difference approximation of derivative of f at x.
     * For better performance/accuracy with up to 2-hop routes, you can use the
     * closed-form derivative from the white paper. But here's a general approach.
     */
    private numericalDerivative(
        f: (x: BigNumber) => BigNumber,
        x: BigNumber,
    ): BigNumber {
        const h = x.multipliedBy('1e-9').plus('1e-12'); // small step
        const xPlus = x.plus(h);
        const xMinus = x.minus(h).isNegative() ? new BigNumber(0) : x.minus(h);

        const fPlus = f(xPlus);
        const fMinus = f(xMinus);
        return fPlus.minus(fMinus).div(h.multipliedBy(2));
    }

    /**
     * Solve for lambda in f'(x_i)=lambda aggregator approach:
     * we do a binary search for lambda in [0, max], ensuring sum of x_i(lambda)= totalIn.
     */
    private solveLambdaForAllocation(
        routes: RouteCandidate[],
        totalIn: BigNumber,
    ): BigNumber {
        // bracket possible lambda
        let lambdaLow = new BigNumber(0);
        let lambdaHigh = new BigNumber(0);
        for (const r of routes) {
            const d0 = r.derivative(new BigNumber(0));
            if (d0.isGreaterThan(lambdaHigh)) {
                lambdaHigh = d0;
            }
        }
        // expand a bit
        lambdaHigh = lambdaHigh.multipliedBy(2);

        // binary search
        for (let i = 0; i < O1SmartRouterServiceV3.MAX_ITER; i++) {
            const mid = lambdaLow.plus(lambdaHigh).div(2);
            const sumX = routes.reduce((acc, r) => {
                const x_i = this.findXGivenDerivative(r, mid, totalIn);
                return acc.plus(x_i);
            }, new BigNumber(0));

            if (sumX.isGreaterThan(totalIn)) {
                // sum too big => derivative too small => we must raise lambda
                lambdaLow = mid;
            } else {
                // sum < totalIn => derivative too large => lower lambda
                lambdaHigh = mid;
            }
        }

        return lambdaLow.plus(lambdaHigh).div(2);
    }

    /**
     * For a route r, we want x >= 0 such that r.derivative(x) ~ lambda (if possible).
     * If derivative(0) < lambda => x=0
     * If derivative(maxX) > lambda => x=maxX
     * else binary search in [0,maxX].
     */
    private findXGivenDerivative(
        r: RouteCandidate,
        lambda: BigNumber,
        maxX: BigNumber,
    ): BigNumber {
        const d0 = r.derivative(new BigNumber(0));
        // if derivative(0) < lambda => best x=0
        if (d0.isLessThan(lambda)) {
            return new BigNumber(0);
        }
        const dMax = r.derivative(maxX);
        if (dMax.isGreaterThan(lambda)) {
            return maxX;
        }

        let left = new BigNumber(0);
        let right = maxX;
        for (let i = 0; i < O1SmartRouterServiceV3.MAX_ITER; i++) {
            const mid = left.plus(right).div(2);
            const dMid = r.derivative(mid);
            if (dMid.isGreaterThan(lambda)) {
                left = mid;
            } else {
                right = mid;
            }
        }
        return left.plus(right).div(2);
    }

    /**
     * Return a PairModel if it exists for (tokenIn, tokenOut).
     */
    private getPairByTokens(
        pairs: PairModel[],
        tIn: string,
        tOut: string,
    ): PairModel | undefined {
        return pairs.find((p) => {
            const a = p.firstToken.identifier;
            const b = p.secondToken.identifier;
            return (tIn === a && tOut === b) || (tIn === b && tOut === a);
        });
    }

    /**
     * Return (inRes, outRes) in correct order so we can do getAmountOut
     */
    private getOrderedReserves(
        tokenInID: string,
        pair: PairModel,
    ): [BigNumber, BigNumber] {
        if (tokenInID === pair.firstToken.identifier) {
            return [
                new BigNumber(pair.info.reserves0),
                new BigNumber(pair.info.reserves1),
            ];
        } else {
            return [
                new BigNumber(pair.info.reserves1),
                new BigNumber(pair.info.reserves0),
            ];
        }
    }

    /**
     * Return the address route for actual transactions: for each consecutive tokens,
     * find the PairModel and push pair.address
     */
    private getAddressRoute(path: string[], pairs: PairModel[]): string[] {
        const addresses: string[] = [];
        for (let i = 0; i < path.length - 1; i++) {
            const pair = this.getPairByTokens(pairs, path[i], path[i + 1]);
            if (pair) {
                addresses.push(pair.address);
            }
        }
        return addresses;
    }
}
