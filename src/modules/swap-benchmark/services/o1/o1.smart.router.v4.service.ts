import { PairModel } from 'src/modules/pair/models/pair.model';
import { getPairByTokens } from '../../router.utils';
import BigNumber from 'bignumber.js';
import { getAmountOut } from 'src/modules/pair/pair.utils';
import { ParallelRouteAllocation } from '../../models/models';

type PoolSegment = {
    poolAddress: string; // which Pool / Pair address?
    tokenIn: string; // input token at that hop
    tokenOut: string; // output token
};

interface PoolState {
    // We keep track of each pool’s updated reserves
    // for token0 and token1 exactly as the contract sees them
    pair: PairModel;
    reserveA: BigNumber; // for pair.firstToken
    reserveB: BigNumber; // for pair.secondToken
}

// Allocation seems to work. Combine with v3 who seems to have working grouping
export class O1SmartRouterServiceV4 {
    async computeBestSwapRoute(
        paths: string[][],
        pairs: PairModel[],
        amount: string,
    ): Promise<{
        allocations: ParallelRouteAllocation[];
        totalResult: string;
    }> {
        // 1) Build routePlans
        const routePlans: PoolSegment[][] = [];
        for (const path of paths) {
            const segments = buildRoutePlan(path, pairs);
            if (segments.length > 0) {
                routePlans.push(segments);
            }
        }

        if (routePlans.length === 0) {
            return {
                allocations: [],
                totalResult: '0',
            };
        }

        // 2) Convert total input to BigNumber
        const totalInputBN = new BigNumber(amount);
        if (totalInputBN.isZero() || totalInputBN.isNegative()) {
            return {
                allocations: [],
                totalResult: '0',
            };
        }

        // 3) Optimize the allocations
        const { bestAllocations, bestTotalOutput } =
            optimizeAllocationsFixedInput(
                routePlans,
                pairs,
                totalInputBN,
                50, // iteration steps
            );

        // 4) Re-run the concurrency simulation one last time
        //    to retrieve per-route final outputs
        const finalPoolStates = createInitialPoolStates(pairs);
        const { routeOutputs, routeIntermediaries } =
            simulateMultiRouteFixedInput(
                routePlans,
                finalPoolStates,
                bestAllocations,
            );

        // 5) Build the final "ParallelRouteAllocation[]"
        //    to show how each route was used
        const out: ParallelRouteAllocation[] = [];
        for (let i = 0; i < routePlans.length; i++) {
            const path = paths[i]; // original path
            // get the route's pairs
            const addressRoute = [];
            for (let j = 0; j < path.length - 1; j++) {
                const pair = getPairByTokens(pairs, path[j], path[j + 1]);
                if (pair) {
                    addressRoute.push(pair.address);
                }
            }
            out.push({
                tokenRoute: path,
                addressRoute,
                inputAmount: bestAllocations[i].toFixed(),
                outputAmount: routeOutputs[i].toFixed(),
                intermediaryAmounts: routeIntermediaries[i],
            });
        }

        // 6) Return the final result
        return {
            allocations: out,
            totalResult: bestTotalOutput.toFixed(),
        };
    }
}

function buildRoutePlan(path: string[], pairs: PairModel[]): PoolSegment[] {
    const segments: PoolSegment[] = [];

    for (let i = 0; i < path.length - 1; i++) {
        const tokenIn = path[i];
        const tokenOut = path[i + 1];

        const pair = getPairByTokens(pairs, tokenIn, tokenOut);
        if (!pair) {
            // Shouldn't happen if the path is valid,
            // but handle gracefully
            continue;
        }

        segments.push({
            poolAddress: pair.address,
            tokenIn,
            tokenOut,
        });
    }

    return segments;
}

function simulateMultiRouteFixedInput(
    routePlans: PoolSegment[][], // routePlans[i] is an array of segments for route i
    poolStates: Record<string, PoolState>,
    allocations: BigNumber[], // how much input goes into each route i
): {
    routeOutputs: BigNumber[]; // how much final token is produced per route
    routeIntermediaries: string[][]; // for debugging: each route’s intermediate amounts
} {
    const routeCount = routePlans.length;

    // "currentTokenAmounts[i][hopIndex]"
    // is how much the route i has at the start of that hop
    const currentTokenAmounts = allocations.map((a) => [a]);
    // We also store intermediate steps for debugging
    const routeIntermediaries: string[][] = allocations.map((a) => [
        a.toFixed(),
    ]);

    // We will process at most 4 hops (since each route can have up to 4 hops).
    for (let hopIndex = 0; hopIndex < 4; hopIndex++) {
        // Gather segments that exist at this hopIndex
        // i.e. route i has routePlans[i][hopIndex]
        type GroupKey = string; // e.g. poolAddress + "-" + tokenIn + "-" + tokenOut
        const concurrencyMap: Record<
            GroupKey,
            {
                poolAddress: string;
                tokenIn: string;
                tokenOut: string;
                routesInGroup: number[]; // which route indices are in this group
                totalIn: BigNumber;
            }
        > = {};

        // 1) Build concurrency groups
        for (let i = 0; i < routeCount; i++) {
            const segments = routePlans[i];
            if (hopIndex >= segments.length) {
                // this route has no more hops,
                // it might already be done
                continue;
            }
            const seg = segments[hopIndex];
            const key = `${seg.poolAddress}-${seg.tokenIn}-${seg.tokenOut}`;
            if (!concurrencyMap[key]) {
                concurrencyMap[key] = {
                    poolAddress: seg.poolAddress,
                    tokenIn: seg.tokenIn,
                    tokenOut: seg.tokenOut,
                    routesInGroup: [],
                    totalIn: new BigNumber(0),
                };
            }
            concurrencyMap[key].routesInGroup.push(i);
            concurrencyMap[key].totalIn = concurrencyMap[key].totalIn.plus(
                // the "currentTokenAmounts[i][hopIndex]" is how much route i has at the start of this hop
                new BigNumber(currentTokenAmounts[i][hopIndex] || 0),
            );
        }

        // If no concurrency groups, we are done
        const groupKeys = Object.keys(concurrencyMap);
        if (groupKeys.length === 0) {
            break;
        }

        // 2) For each concurrency group, compute how totalIn => totalOut
        for (const gk of groupKeys) {
            const group = concurrencyMap[gk];
            const pool = poolStates[group.poolAddress];
            if (!pool) {
                // Should not happen if the pairs are correct
                continue;
            }

            // We figure out direction: is tokenIn == pair.firstToken.identifier ?
            // Then we pass group.totalIn to get the totalOut from the pool
            // using getAmountOut logic.

            let tokenInReserves = new BigNumber(0);
            let tokenOutReserves = new BigNumber(0);

            const tokenInID = group.tokenIn;
            // const tokenOutID = group.tokenOut;

            // Identify how the reserves in "pool" map to tokenIn and tokenOut
            if (tokenInID === pool.pair.firstToken.identifier) {
                tokenInReserves = pool.reserveA;
                tokenOutReserves = pool.reserveB;
            } else {
                tokenInReserves = pool.reserveB;
                tokenOutReserves = pool.reserveA;
            }

            // We do one big swap from totalIn => totalOut
            const totalOut = getAmountOut(
                group.totalIn.toFixed(),
                tokenInReserves.toFixed(),
                tokenOutReserves.toFixed(),
                pool.pair.totalFeePercent,
            );

            const totalOutBN = new BigNumber(totalOut);

            // 3) Distribute totalOut among the routes in proportion to their input
            // so route i gets fraction = routeInput / totalIn
            for (const rIdx of group.routesInGroup) {
                const routeIn = new BigNumber(
                    currentTokenAmounts[rIdx][hopIndex] || 0,
                );
                if (group.totalIn.isZero()) {
                    // no input, skip
                    currentTokenAmounts[rIdx][hopIndex + 1] = new BigNumber(0);
                } else {
                    const ratio = routeIn.div(group.totalIn);
                    const routeOut = totalOutBN.multipliedBy(ratio);
                    currentTokenAmounts[rIdx][hopIndex + 1] = routeOut;
                }
                // update intermediary for debugging
                if (currentTokenAmounts[rIdx][hopIndex + 1]) {
                    routeIntermediaries[rIdx].push(
                        currentTokenAmounts[rIdx][hopIndex + 1].toFixed(),
                    );
                }
            }

            // 4) Update the pool’s reserves
            // The new tokenInReserves = old + group.totalIn
            // The new tokenOutReserves = old - totalOutBN
            // (in BigNumber)
            const newTokenInReserves = tokenInReserves.plus(group.totalIn);
            const newTokenOutReserves = tokenOutReserves.minus(totalOutBN);

            if (tokenInID === pool.pair.firstToken.identifier) {
                pool.reserveA = newTokenInReserves;
                pool.reserveB = newTokenOutReserves;
            } else {
                pool.reserveB = newTokenInReserves;
                pool.reserveA = newTokenOutReserves;
            }
        }
    }

    // at this point, currentTokenAmounts[i][lastHopIndex]
    // is how much final token each route i ended up with
    // but note: some routes might have fewer hops than others
    // we pick the last non-empty entry from currentTokenAmounts[i].
    const routeOutputs = currentTokenAmounts.map((amts) => {
        // last entry
        return amts[amts.length - 1] || new BigNumber(0);
    });

    return {
        routeOutputs,
        routeIntermediaries,
    };
}

function optimizeAllocationsFixedInput(
    routePlans: PoolSegment[][],
    pairs: PairModel[],
    totalInput: BigNumber,
    maxIterations = 50,
) {
    const routeCount = routePlans.length;
    if (routeCount === 0) {
        return {
            bestAllocations: [] as BigNumber[],
            bestTotalOutput: new BigNumber(0),
        };
    }

    // Start with an even split across all routes
    let allocations = new Array<BigNumber>(routeCount)
        .fill(new BigNumber(0))
        .map(() => totalInput.div(routeCount));

    // We'll keep track of the best found so far
    let bestAllocations = allocations.slice();
    let bestTotalOutput = new BigNumber(0);

    for (let iter = 0; iter < maxIterations; iter++) {
        // 1) Prepare a fresh "poolStates" for the concurrency simulation
        const poolStates = createInitialPoolStates(pairs);

        // 2) Simulate
        const { routeOutputs } = simulateMultiRouteFixedInput(
            routePlans,
            poolStates,
            allocations,
        );
        const totalOut = routeOutputs.reduce(
            (acc, v) => acc.plus(v),
            new BigNumber(0),
        );

        // Check if we improved
        if (totalOut.isGreaterThan(bestTotalOutput)) {
            bestTotalOutput = totalOut;
            bestAllocations = allocations.map((a) => a); // copy
        }

        // 3) Attempt small re‐allocations among routes
        //    We'll try random pairs i, j
        const i = Math.floor(Math.random() * routeCount);
        let j = Math.floor(Math.random() * routeCount);
        if (j === i && routeCount > 1) {
            j = (j + 1) % routeCount;
        }

        // small shift:
        const delta = allocations[i].multipliedBy(0.05); // shift 5% from i to j
        if (delta.isZero()) {
            continue; // no movement possible
        }

        // propose new distribution
        const newAllocations = allocations.slice();
        newAllocations[i] = newAllocations[i].minus(delta);
        newAllocations[j] = newAllocations[j].plus(delta);

        // only accept if we remain non‐negative
        if (newAllocations[i].isLessThan(0)) {
            continue;
        }

        // 4) Evaluate new distribution
        const newPoolStates = createInitialPoolStates(pairs);
        const { routeOutputs: newRouteOutputs } = simulateMultiRouteFixedInput(
            routePlans,
            newPoolStates,
            newAllocations,
        );
        const newTotalOut = newRouteOutputs.reduce(
            (acc, v) => acc.plus(v),
            new BigNumber(0),
        );

        if (newTotalOut.isGreaterThan(totalOut)) {
            allocations = newAllocations;
        } else {
            // revert
        }
    }

    return {
        bestAllocations,
        bestTotalOutput,
    };
}

function createInitialPoolStates(pairs: PairModel[]) {
    const poolStates: Record<string, PoolState> = {};
    for (const p of pairs) {
        poolStates[p.address] = {
            pair: p,
            reserveA: new BigNumber(p.info.reserves0),
            reserveB: new BigNumber(p.info.reserves1),
        };
    }
    return poolStates;
}
