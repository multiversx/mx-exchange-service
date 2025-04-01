import BigNumber from 'bignumber.js';

export interface PoolInfo {
    address: string;
    tokenIn: string; // e.g. "HTM-f51d55"
    tokenOut: string; // e.g. "WEGLD-bd4d79"
    reserveIn: BigNumber; // how many "tokenIn" in the pool
    reserveOut: BigNumber; // how many "tokenOut" in the pool
    feePercent: number; // e.g. 0.3 => 0.3%
}

export interface Hop {
    poolIndex: number; // which pool from our "pools" array
    // In practice, we might also store tokenIn/tokenOut here, but let's keep it minimal.
}

export interface Route {
    hops: Hop[]; // e.g. [ {poolIndex: 0}, {poolIndex: 5} ]
}

/***************************************************
 * 2) The core "shared slippage" logic for routes
 ***************************************************/
/**
 * Given:
 *   - an array of routes,
 *   - an array of pools,
 *   - an allocation x[i] for each route i (how much of TokenA is going in),
 * This function returns an array finalOut[i] giving the final amount of TokenB from route i
 * after properly accounting for any overlapping pools.
 *
 * The key is: if multiple routes share a pool as a "hop" at the same stage, the total inflow
 * to that pool is sum of those routes' partial amounts for that stage, *and* they all share
 * the same outflow proportionally.
 */
export function computeAllRouteOutputs(
    routes: Route[],
    pools: PoolInfo[],
    xAlloc: BigNumber[], // how many "TokenA" per route
): BigNumber[] {
    // For simplicity, assume we only have 2 or 3 hops max per route from A -> B.
    // The extension to more hops is straightforward.

    // Step 1: We'll keep track of "current amount" for each route at each hop.
    // Initially, route i has xAlloc[i] of token A.
    // We'll do up to 3 hops. Each hop: gather routes that use the same pool, sum up inflows, apply AMM formula, distribute outflow.

    // We'll store routeAmounts[i] = current quantity of the route's token at the current hop
    const routeAmounts = xAlloc.map((val) => val);

    // We'll handle up to 3 hops in a for-loop. If a route has fewer hops, we skip.
    const maxHops = Math.max(...routes.map((r) => r.hops.length));

    for (let hopIndex = 0; hopIndex < maxHops; hopIndex++) {
        // Group routes by the pool used at this hop.
        // A map from poolIndex -> array of route indices that use that pool *at this hop*.
        const poolToRoutesMap = new Map<number, number[]>();

        // 2a) For each route i, check if it has a hop at hopIndex
        for (let i = 0; i < routes.length; i++) {
            if (hopIndex < routes[i].hops.length) {
                const poolIdx = routes[i].hops[hopIndex].poolIndex;
                if (!poolToRoutesMap.has(poolIdx)) {
                    poolToRoutesMap.set(poolIdx, []);
                }

                poolToRoutesMap.get(poolIdx).push(i);
            }
        }

        // 2b) For each pool in poolToRoutesMap, compute total inflow = sum of routeAmounts[i].
        //     Then compute outflow using the AMM formula, then distribute proportionally to each route.
        for (const [poolIdx, routeIndices] of poolToRoutesMap.entries()) {
            const pool = pools[poolIdx];

            // Sum inflow
            let totalInflow = new BigNumber(0);
            for (const routeI of routeIndices) {
                totalInflow = totalInflow.plus(routeAmounts[routeI]);
            }

            if (totalInflow.lte(0)) {
                // no flow => those routes get 0 out
                for (const routeI of routeIndices) {
                    routeAmounts[routeI] = new BigNumber(0);
                }
                continue;
            }

            // AMM formula (constant product), e.g. out = (1 - fee) * reserveOut * totalInflow / (reserveIn + (1 - fee)*totalInflow)
            const gamma = new BigNumber(1)
                .minus(pool.feePercent / 10000)
                .dividedBy(100); // e.g. 0.997 for 0.3% fee
            const reserveIn = new BigNumber(pool.reserveIn);
            const reserveOut = new BigNumber(pool.reserveOut);

            const numerator = gamma
                .multipliedBy(reserveOut)
                .multipliedBy(totalInflow);
            const inflowGamma = gamma.multipliedBy(totalInflow);
            const denominator = reserveIn.plus(inflowGamma);
            const totalOut = denominator.lte(0)
                ? new BigNumber(0)
                : numerator.dividedBy(denominator);

            // Distribute outflow among routes in proportion to their fraction of the inflow
            for (const routeI of routeIndices) {
                const fraction = routeAmounts[routeI].dividedBy(totalInflow);
                const outI = totalOut.multipliedBy(fraction);
                routeAmounts[routeI] = outI;
            }

            // pool.reserveIn = pool.reserveIn.plus(totalInflow)
            // pool.reserveOut = pool.reserveOut.minus(totalOut);

            // Now, for a second hop, we have to interpret routeAmounts[routeI] as the "inflow" to the next pool, etc.
            // But we also need to "update" the pool's reserves if the same pool is used again in another step.
            // Usually, in a single tx aggregator approach, we'd treat everything as simultaneous.
            // So we do not update `pool.reserveIn/out` here. We simply apply them as if they're initial states.
            //
            // If you prefer a sequential approach (like 1st hop changes the pool for 2nd hop), you'd do:
            //   pool.reserveIn += totalInflow;
            //   pool.reserveOut -= totalOut; // (assuming out is the same token side)
            // But that leads to a more complicated question of route ordering.
            //
            // Typically, a single aggregator transaction is atomic. The standard approach is to treat the pool reserves
            // as "initial" for the entire route. The aggregator can't "beat itself" to the pool.
            // So we do not re-update the reserves after each hop in the same transaction.
        }
    }

    return routeAmounts;
}

/***************************************************
 * 3) Objective & Gradient for the solver
 ***************************************************/

/**
 * The objective function: sum of finalOut over all routes,
 * given the xAlloc vector (the "TokenA" allocated to each route).
 */
export function objectiveFunction(
    routes: Route[],
    pools: PoolInfo[],
    xAlloc: BigNumber[],
): BigNumber {
    const finalOuts = computeAllRouteOutputs(routes, pools, xAlloc);
    let sum = new BigNumber(0);
    for (const out of finalOuts) {
        sum = sum.plus(out);
    }
    return sum;
}

/**
 * Approximate partial derivatives via finite differences.
 * gradient[i] ~ (F(x + eps * e_i) - F(x)) / eps
 */
export function gradientFunction(
    routes: Route[],
    pools: PoolInfo[],
    xAlloc: BigNumber[],
    eps: BigNumber,
): BigNumber[] {
    const baseVal = objectiveFunction(routes, pools, xAlloc);
    const grad = new Array(xAlloc.length).fill(new BigNumber(0));

    for (let i = 0; i < xAlloc.length; i++) {
        const oldVal = xAlloc[i];
        xAlloc[i] = oldVal.plus(eps);
        const newVal = objectiveFunction(routes, pools, xAlloc);
        const delta = newVal.minus(baseVal);
        grad[i] = delta.dividedBy(eps);
        xAlloc[i] = oldVal; // restore
    }

    return grad;
}

/***************************************************
 * 4) A Utility to Enforce x_i >= 0 and sum(x_i) = A_total
 ***************************************************/
/**
 * Projects an arbitrary vector "v" onto the simplex defined by sum(x_i)=sumTarget, x_i>=0
 * This is a standard "Euclidean projection onto simplex" method
 * (See "Projection onto the simplex: A simple proof and an O(n) algorithm" by Wang & Carreira-Perpinan)
 */
export function projectToSimplex(v: BigNumber[], sumTarget: BigNumber): void {
    // 1) shift so it sums to sumTarget but might have negative values
    // 2) for negative coords, we clamp them, but must readjust so sum= sumTarget
    // There's a well-known O(n log n) or O(n) method. We'll do a simple version for clarity.

    // We'll do: sort v descending, find "rho" where partial sum - shift leads to 0 cutoff
    const N = v.length;
    const sorted = [...v].sort((a, b) => b.comparedTo(a));
    let runningSum = new BigNumber(0);
    let rho = new BigNumber(0);
    for (let i = 0; i < N; i++) {
        runningSum = runningSum.plus(sorted[i]);
        const diff = runningSum.minus(sumTarget);

        const t = diff.dividedBy(i + 1);
        const sortedMinusT = sorted[i].minus(t);
        if (sortedMinusT.gt(0)) {
            rho = t;
        }
    }
    // then x_i = max(v_i - rho, 0)
    for (let i = 0; i < N; i++) {
        v[i] = BigNumber.max(v[i].minus(rho), new BigNumber(0));
    }
}

/***************************************************
 * 5) The Main Solver
 ***************************************************/
/**
 * Finds xAlloc that maximizes sum of finalOut across all routes,
 * while sum(xAlloc)=A_total and xAlloc[i]>=0.
 *
 * This uses a simple projected gradient ascent approach with finite differences.
 *
 * - routes: an array of routes (each with an array of hops)
 * - pools: array of all pools
 * - A_total: total input
 * - xInit: optional initial guess
 */
export function sharedPoolSolver(
    routes: Route[],
    pools: PoolInfo[],
    A_total: BigNumber,
    xInit?: BigNumber[],
): { xAlloc: BigNumber[]; totalOut: BigNumber } {
    const N = routes.length;
    // 1) If no initial guess, just spread it evenly or all in the single best route
    const x: BigNumber[] =
        xInit && xInit.length === N
            ? [...xInit]
            : new Array(N).fill(A_total.dividedBy(N));

    // We make sure it sums to A_total
    projectToSimplex(x, A_total);

    // Hyperparams for the gradient approach
    const maxIters = 50;
    const eps = new BigNumber('1e-4'); // finite diff step
    let stepSize = 0.1; // learning rate

    let bestVal = objectiveFunction(routes, pools, x);
    let bestX = [...x];

    for (let iter = 0; iter < maxIters; iter++) {
        // compute gradient
        const grad = gradientFunction(routes, pools, x, eps);

        // do a gradient ascent step: x = x + stepSize * grad
        for (let i = 0; i < N; i++) {
            const ascentStep = grad[i].multipliedBy(stepSize);
            x[i] = x[i].plus(ascentStep);
        }
        // project back onto simplex
        projectToSimplex(x, A_total);

        // evaluate
        const val = objectiveFunction(routes, pools, x);
        if (val > bestVal) {
            bestVal = val;
            bestX = [...x];
        } else {
            // if we didn't improve, reduce step size
            stepSize *= 0.5;
        }
    }

    // Return the best found
    return { xAlloc: bestX, totalOut: bestVal };
}
