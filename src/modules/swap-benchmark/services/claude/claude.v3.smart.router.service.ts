import { Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { PairModel } from 'src/modules/pair/models/pair.model';
import { getAmountOut } from 'src/modules/pair/pair.utils';
import { getOrderedReserves, getPairByTokens } from '../../router.utils';
import { ParallelRouteAllocation } from '../../models/models';
import { SWAP_TYPE } from 'src/modules/auto-router/models/auto-route.model';

/**
 * Type definition for optimal route result
 */
export interface OptimalRoutingResult {
    allocations: ParallelRouteAllocation[];
    totalResult: string;
}

/**
 * Type definition for a simulated pool
 */
type SimulatedPool = {
    address: string;
    token0: string;
    token1: string;
    reserve0: BigNumber;
    reserve1: BigNumber;
    fee: number;
};

/**
 * Type definition for a path with pool information
 */
type PathWithPools = {
    path: string[]; // Token route
    pools: string[]; // Pool addresses
    hops: number; // Number of hops
    estimatedOutput: BigNumber; // Estimated output for a unit of input
};

@Injectable()
export class ClaudeV3SmartRouterService {
    /**
     * Find optimal routing with awareness of shared pools
     * @param paths All possible paths
     * @param pairs All available pairs
     * @param amount Amount to swap
     * @param maxHops Maximum number of hops (default: 3)
     * @param maxRoutes Maximum number of parallel routes to consider (default: 5)
     * @param maxIterations Maximum number of optimization iterations (default: 20)
     * @returns Optimal routing result
     */
    async computeBestSwapRoute(
        paths: string[][],
        pairs: PairModel[],
        amount: string,
        swapType = SWAP_TYPE.fixedInput,
        maxRoutes = 10,
        maxIterations = 20,
    ): Promise<OptimalRoutingResult> {
        const totalInput = new BigNumber(amount);

        // Create paths with pool information
        const pathsWithPools: PathWithPools[] = [];
        for (const path of paths) {
            const pools: string[] = [];
            let valid = true;

            for (let i = 0; i < path.length - 1; i++) {
                const pair = getPairByTokens(pairs, path[i], path[i + 1]);
                if (!pair) {
                    valid = false;
                    break;
                }
                pools.push(pair.address);
            }

            if (valid) {
                // Estimate output for a small amount of input to rank paths
                const testAmount = new BigNumber('10000000000000'); // Small test amount
                const output = this.simulatePathExecution(
                    path,
                    testAmount.toFixed(),
                    pairs,
                );

                console.log(path.join(' > '), output.toFixed());

                pathsWithPools.push({
                    path,
                    pools,
                    hops: path.length - 1,
                    estimatedOutput: output,
                });
            }
        }

        // Sort paths by estimated output (descending)
        pathsWithPools.sort((a, b) =>
            b.estimatedOutput.comparedTo(a.estimatedOutput),
        );
        console.log(pathsWithPools.length);
        // Select top paths for optimization
        const selectedPaths = pathsWithPools.slice(0, maxRoutes);

        // Find the optimal allocation using simulation
        return this.optimizeAllocationWithSimulation(
            selectedPaths,
            pairs,
            totalInput,
            maxIterations,
        );
    }

    /**
     * Optimize allocation across routes using simulation
     * @param paths Paths with pool information
     * @param pairs All available pairs
     * @param totalInput Total input amount
     * @param maxIterations Maximum optimization iterations
     * @returns Optimal routing result
     */
    private optimizeAllocationWithSimulation(
        paths: PathWithPools[],
        pairs: PairModel[],
        totalInput: BigNumber,
        maxIterations: number,
    ): OptimalRoutingResult {
        // Create a map of all unique pools
        const uniquePools = new Map<string, SimulatedPool>();

        for (const path of paths) {
            for (let i = 0; i < path.pools.length; i++) {
                const poolAddress = path.pools[i];
                if (!uniquePools.has(poolAddress)) {
                    const pair = pairs.find((p) => p.address === poolAddress);
                    if (pair) {
                        uniquePools.set(poolAddress, {
                            address: poolAddress,
                            token0: pair.firstToken.identifier,
                            token1: pair.secondToken.identifier,
                            reserve0: new BigNumber(pair.info.reserves0),
                            reserve1: new BigNumber(pair.info.reserves1),
                            fee: pair.totalFeePercent,
                        });
                    }
                }
            }
        }

        // Initialize allocations - start with even distribution
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        let allocations = paths.map((_path) =>
            totalInput.dividedBy(paths.length),
        );

        // If we only have one path, we're done
        if (paths.length === 1) {
            return this.buildResultFromAllocations(
                [paths[0]],
                [totalInput],
                pairs,
            );
        }

        // Iterative optimization process
        let bestOutput = new BigNumber(0);
        let bestAllocations = [...allocations];

        for (let iteration = 0; iteration < maxIterations; iteration++) {
            // Clone pool states for simulation
            const poolStates = new Map<string, SimulatedPool>();
            uniquePools.forEach((pool, address) => {
                poolStates.set(address, { ...pool });
            });

            // Simulate execution of all routes with current allocations
            let totalOutput = new BigNumber(0);
            const routeOutputs: BigNumber[] = [];

            for (let i = 0; i < paths.length; i++) {
                const path = paths[i];
                const input = allocations[i];

                if (input.isLessThanOrEqualTo(0)) {
                    routeOutputs.push(new BigNumber(0));
                    continue;
                }

                // Simulate execution of this route
                const output = this.simulateRouteWithPoolStates(
                    path.path,
                    path.pools,
                    input.toFixed(),
                    poolStates,
                );

                routeOutputs.push(output);
                totalOutput = totalOutput.plus(output);
            }

            // If we found a better allocation, keep it
            if (totalOutput.isGreaterThan(bestOutput)) {
                bestOutput = totalOutput;
                bestAllocations = [...allocations];
            }

            // Adjust allocations based on marginal output
            if (iteration < maxIterations - 1) {
                allocations = this.adjustAllocations(
                    paths,
                    allocations,
                    routeOutputs,
                    totalInput,
                    pairs,
                );
            }
        }

        // Build the final result
        return this.buildResultFromAllocations(paths, bestAllocations, pairs);
    }

    /**
     * Adjust allocations based on marginal output
     * @param paths Paths with pool information
     * @param currentAllocations Current allocations
     * @param outputs Current outputs
     * @param totalInput Total input amount
     * @param pairs All available pairs
     * @returns Adjusted allocations
     */
    private adjustAllocations(
        paths: PathWithPools[],
        currentAllocations: BigNumber[],
        outputs: BigNumber[],
        totalInput: BigNumber,
        pairs: PairModel[],
    ): BigNumber[] {
        // Calculate marginal utilities for each route
        const marginalUtilities: BigNumber[] = [];
        const stepSize = totalInput.multipliedBy(0.05); // 5% step size

        for (let i = 0; i < paths.length; i++) {
            // Skip routes with zero allocation
            if (
                currentAllocations[i].isLessThanOrEqualTo(0) &&
                outputs[i].isLessThanOrEqualTo(0)
            ) {
                marginalUtilities.push(new BigNumber(0));
                continue;
            }

            // Estimate marginal utility by simulating a small increase
            const incrementedInput = currentAllocations[i].plus(stepSize);
            const incrementedOutput = this.simulatePathExecution(
                paths[i].path,
                incrementedInput.toFixed(),
                pairs,
            );

            // Calculate marginal utility (additional output / additional input)
            const additionalOutput = incrementedOutput.minus(outputs[i]);
            const additionalInput = stepSize;

            if (additionalInput.isZero()) {
                marginalUtilities.push(new BigNumber(0));
            } else {
                marginalUtilities.push(
                    additionalOutput.dividedBy(additionalInput),
                );
            }
        }

        // Find the route with the highest marginal utility
        let bestRouteIndex = 0;
        let bestUtility = marginalUtilities[0] || new BigNumber(0);

        for (let i = 1; i < marginalUtilities.length; i++) {
            if (marginalUtilities[i].isGreaterThan(bestUtility)) {
                bestUtility = marginalUtilities[i];
                bestRouteIndex = i;
            }
        }

        // Find the route with the lowest marginal utility (that has a non-zero allocation)
        let worstRouteIndex = -1;
        let worstUtility = new BigNumber(Infinity);

        for (let i = 0; i < marginalUtilities.length; i++) {
            if (
                currentAllocations[i].isGreaterThan(0) &&
                marginalUtilities[i].isLessThan(worstUtility)
            ) {
                worstUtility = marginalUtilities[i];
                worstRouteIndex = i;
            }
        }

        // If we can't find a better reallocation, return the current allocations
        if (bestRouteIndex === worstRouteIndex || worstRouteIndex === -1) {
            return currentAllocations;
        }

        // Create new allocations by shifting from worst to best
        const newAllocations = [...currentAllocations].map(
            (a) => new BigNumber(a.toFixed()),
        );

        // Determine how much to shift (up to half of the worst route's allocation or the step size)
        const shiftAmount = BigNumber.min(
            currentAllocations[worstRouteIndex].dividedBy(2),
            stepSize,
        );

        if (shiftAmount.isLessThanOrEqualTo(0)) {
            return currentAllocations;
        }

        // Shift allocation from worst to best route
        newAllocations[worstRouteIndex] =
            newAllocations[worstRouteIndex].minus(shiftAmount);
        newAllocations[bestRouteIndex] =
            newAllocations[bestRouteIndex].plus(shiftAmount);

        // Ensure we don't have negative allocations
        for (let i = 0; i < newAllocations.length; i++) {
            if (newAllocations[i].isLessThan(0)) {
                newAllocations[i] = new BigNumber(0);
            }
        }

        // Ensure total allocation equals total input
        const totalAllocation = newAllocations.reduce(
            (sum, allocation) => sum.plus(allocation),
            new BigNumber(0),
        );

        if (!totalAllocation.isEqualTo(totalInput)) {
            const difference = totalInput.minus(totalAllocation);
            // Distribute the difference proportionally
            let remainingDifference = difference;

            for (
                let i = 0;
                i < newAllocations.length && !remainingDifference.isZero();
                i++
            ) {
                if (newAllocations[i].isGreaterThan(0)) {
                    const proportion =
                        newAllocations[i].dividedBy(totalAllocation);
                    const adjustment = proportion.multipliedBy(difference);
                    newAllocations[i] = newAllocations[i].plus(adjustment);
                    remainingDifference = remainingDifference.minus(adjustment);
                }
            }

            // If there's still a tiny difference due to rounding, add it to the first non-zero allocation
            if (!remainingDifference.isZero()) {
                for (let i = 0; i < newAllocations.length; i++) {
                    if (newAllocations[i].isGreaterThan(0)) {
                        newAllocations[i] =
                            newAllocations[i].plus(remainingDifference);
                        break;
                    }
                }
            }
        }

        return newAllocations;
    }

    /**
     * Simulate execution of a path with given pool states
     * @param path Token path
     * @param pools Pool addresses
     * @param inputAmount Input amount
     * @param poolStates Map of pool states
     * @returns Expected output amount
     */
    private simulateRouteWithPoolStates(
        path: string[],
        pools: string[],
        inputAmount: string,
        poolStates: Map<string, SimulatedPool>,
    ): BigNumber {
        let amount = new BigNumber(inputAmount);

        for (let i = 0; i < path.length - 1; i++) {
            const poolAddress = pools[i];
            const pool = poolStates.get(poolAddress);

            if (!pool) {
                return new BigNumber(0);
            }

            const isFirstTokenIn = path[i] === pool.token0;
            const gamma = new BigNumber(1).minus(pool.fee);

            let outputAmount: BigNumber;

            if (isFirstTokenIn) {
                // Token0 -> Token1
                outputAmount = amount
                    .multipliedBy(pool.reserve1)
                    .multipliedBy(gamma)
                    .dividedBy(pool.reserve0.plus(amount.multipliedBy(gamma)));

                // Update pool reserves
                pool.reserve0 = pool.reserve0.plus(amount);
                pool.reserve1 = pool.reserve1.minus(outputAmount);
            } else {
                // Token1 -> Token0
                outputAmount = amount
                    .multipliedBy(pool.reserve0)
                    .multipliedBy(gamma)
                    .dividedBy(pool.reserve1.plus(amount.multipliedBy(gamma)));

                // Update pool reserves
                pool.reserve1 = pool.reserve1.plus(amount);
                pool.reserve0 = pool.reserve0.minus(outputAmount);
            }

            amount = outputAmount;
        }

        return amount;
    }

    /**
     * Simulate execution of a path
     * @param path Token path
     * @param pools Pool addresses
     * @param inputAmount Input amount
     * @param pairs All available pairs
     * @returns Expected output amount
     */
    private simulatePathExecution(
        path: string[],
        inputAmount: string,
        pairs: PairModel[],
    ): BigNumber {
        let amount = new BigNumber(inputAmount);

        for (let i = 0; i < path.length - 1; i++) {
            const tokenIn = path[i];
            const tokenOut = path[i + 1];
            const pair = getPairByTokens(pairs, tokenIn, tokenOut);

            if (!pair) {
                return new BigNumber(0);
            }

            const [tokenInReserves, tokenOutReserves] = getOrderedReserves(
                tokenIn,
                pair,
            );

            amount = getAmountOut(
                amount.toFixed(),
                tokenInReserves,
                tokenOutReserves,
                pair.totalFeePercent,
            );
        }

        return amount;
    }

    /**
     * Build result from optimized allocations
     * @param paths Paths with pool information
     * @param allocations Optimized allocations
     * @param pairs All available pairs
     * @returns Optimal routing result
     */
    private buildResultFromAllocations(
        paths: PathWithPools[],
        allocations: BigNumber[],
        pairs: PairModel[],
    ): OptimalRoutingResult {
        const result: OptimalRoutingResult = {
            allocations: [],
            totalResult: '0',
        };

        let totalOutput = new BigNumber(0);

        // Create a clone of pairs for simulation
        const pairsClone = JSON.parse(JSON.stringify(pairs));

        // To simulate path dependency, we'll process routes in sequence
        for (let i = 0; i < paths.length; i++) {
            const path = paths[i];
            const allocation = allocations[i];

            if (allocation.isLessThanOrEqualTo(0)) {
                continue;
            }

            // Calculate all intermediate amounts
            const amounts = [allocation.toFixed()];
            let currentAmount = allocation;

            for (let j = 0; j < path.path.length - 1; j++) {
                const tokenIn = path.path[j];
                const tokenOut = path.path[j + 1];
                const pair = getPairByTokens(pairsClone, tokenIn, tokenOut);

                if (!pair) {
                    continue;
                }

                const [tokenInReserves, tokenOutReserves] = getOrderedReserves(
                    tokenIn,
                    pair,
                );

                const outputAmount = getAmountOut(
                    currentAmount.toFixed(),
                    tokenInReserves,
                    tokenOutReserves,
                    pair.totalFeePercent,
                );

                amounts.push(outputAmount.toFixed());
                currentAmount = outputAmount;

                // Update pair reserves to simulate path dependency
                if (tokenIn === pair.firstToken.identifier) {
                    pair.info.reserves0 = new BigNumber(pair.info.reserves0)
                        .plus(currentAmount)
                        .toFixed();
                    pair.info.reserves1 = new BigNumber(pair.info.reserves1)
                        .minus(outputAmount)
                        .toFixed();
                } else {
                    pair.info.reserves1 = new BigNumber(pair.info.reserves1)
                        .plus(currentAmount)
                        .toFixed();
                    pair.info.reserves0 = new BigNumber(pair.info.reserves0)
                        .minus(outputAmount)
                        .toFixed();
                }
            }

            // The last amount is the output
            const outputAmount = amounts[amounts.length - 1];
            totalOutput = totalOutput.plus(outputAmount);

            // Create the route allocation
            result.allocations.push({
                tokenRoute: path.path,
                addressRoute: path.pools,
                inputAmount: allocation.toFixed(),
                outputAmount: outputAmount,
                intermediaryAmounts: amounts.slice(1), // Skip the input amount
            });
        }

        result.totalResult = totalOutput.toFixed();

        return result;
    }
}
