import BigNumber from 'bignumber.js';
import { SWAP_TYPE } from 'src/modules/auto-router/models/auto-route.model';
import { PairModel } from 'src/modules/pair/models/pair.model';
import { getAmountIn, getAmountOut } from 'src/modules/pair/pair.utils';
import { ParallelRouteAllocation } from '../../models/models';

export class ClaudeV4SmartRouterService {
    /**
     * Compute the best swap route with optimal allocations across multiple paths
     *
     * @param paths Array of token paths (each path is an array of token identifiers)
     * @param pairs Array of available pairs (pools)
     * @param amount Input or output amount (depending on swapType)
     * @param swapType Whether this is a fixed input or fixed output swap
     * @returns Optimal allocations for each route and the total result
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
            throw new Error('No paths provided');
        }

        if (new BigNumber(amount).isLessThanOrEqualTo(0)) {
            throw new Error('Amount must be greater than 0');
        }

        // Filter out invalid paths (those with missing pools)
        const validPaths = this.filterValidPaths(paths, pairs);

        if (validPaths.length === 0) {
            throw new Error('No valid paths found');
        }

        // If only one valid path, use it for all the amount
        if (validPaths.length === 1) {
            return this.allocateToSingleRoute(
                validPaths[0],
                pairs,
                amount,
                swapType,
            );
        }

        // Check if routes share any pools
        const hasSharedPools = this.hasSharedPools(validPaths, pairs);

        // Compute optimal allocations based on swap type
        if (swapType === SWAP_TYPE.fixedInput) {
            return await this.computeOptimalAllocationsFixedInput(
                validPaths,
                pairs,
                amount,
                hasSharedPools,
            );
        } else {
            return await this.computeOptimalAllocationsFixedOutput(
                validPaths,
                pairs,
                amount,
                hasSharedPools,
            );
        }
    }

    /**
     * Filter out paths that don't have valid pools for all segments
     */
    private filterValidPaths(
        paths: string[][],
        pairs: PairModel[],
    ): string[][] {
        return paths.filter((path) => {
            // Each path must have pools for all its segments
            for (let i = 0; i < path.length - 1; i++) {
                const pair = this.getPairByTokens(pairs, path[i], path[i + 1]);
                if (!pair) {
                    return false;
                }
            }
            return true;
        });
    }

    /**
     * Check if any pools are shared among different routes
     */
    private hasSharedPools(paths: string[][], pairs: PairModel[]): boolean {
        // Map to store which pools are used by each path
        const poolUsage = new Map<string, number>();

        for (const path of paths) {
            for (let i = 0; i < path.length - 1; i++) {
                const pair = this.getPairByTokens(pairs, path[i], path[i + 1]);
                if (pair) {
                    const count = poolUsage.get(pair.address) || 0;
                    poolUsage.set(pair.address, count + 1);

                    // If pool is used more than once, routes share pools
                    if (count > 0) {
                        return true;
                    }
                }
            }
        }

        return false;
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
                    addressRoute: this.getAddressRoute(pairs, path),
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
     * Compute optimal allocations for fixed input swaps
     */
    private async computeOptimalAllocationsFixedInput(
        paths: string[][],
        pairs: PairModel[],
        amount: string,
        hasSharedPools: boolean,
    ): Promise<{
        allocations: ParallelRouteAllocation[];
        totalResult: string;
    }> {
        if (hasSharedPools) {
            // For shared pools use iterative approach
            return this.computeAllocationsWithSharedPoolsFixedInput(
                paths,
                pairs,
                amount,
            );
        } else {
            console.log('HERE');
            // For independent pools use Lagrange Multiplier method
            return this.computeAllocationsWithLagrangeFixedInput(
                paths,
                pairs,
                amount,
            );
        }
    }

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

        // Find optimal phi value
        const phi = this.findOptimalPhi(pathParams, totalAmount);

        // Calculate allocations for each path using phi
        const allocations: { path: string[]; amount: BigNumber }[] = [];
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
                allocations.push({
                    path: paths[i],
                    amount: allocation,
                });
                totalAllocated = totalAllocated.plus(allocation);
            }
        }

        // Normalize allocations to match exactly the total amount
        const normalizationFactor = totalAmount.dividedBy(totalAllocated);

        // Calculate final allocations and result
        const routeAllocations: ParallelRouteAllocation[] = [];
        let totalOutput = new BigNumber(0);

        for (const allocation of allocations) {
            const adjustedInput =
                allocation.amount.multipliedBy(normalizationFactor);
            const inputAmountStr = adjustedInput.toFixed();

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
                addressRoute: this.getAddressRoute(pairs, allocation.path),
                inputAmount: inputAmountStr,
                outputAmount,
                intermediaryAmounts,
            });

            totalOutput = totalOutput.plus(outputAmount);
        }

        return {
            allocations: routeAllocations,
            totalResult: totalOutput.toFixed(),
        };
    }

    /**
     * Calculate alpha, beta, epsilon parameters for a path
     */
    private calculatePathParameters(
        path: string[],
        pairs: PairModel[],
    ): { alpha: BigNumber; beta: BigNumber; epsilon: BigNumber } {
        console.log(path);
        if (path.length === 2) {
            // Single hop route
            const tokenIn = path[0];
            const tokenOut = path[1];
            const pair = this.getPairByTokens(pairs, tokenIn, tokenOut);

            if (!pair) {
                throw new Error(
                    `Pool not found for path ${tokenIn}-${tokenOut}`,
                );
            }

            const [reserves0, reserves1] = this.getOrderedReserves(
                tokenIn,
                pair,
            );
            const r0 = new BigNumber(reserves0);
            const r1 = new BigNumber(reserves1);
            const gamma = new BigNumber(1).minus(pair.totalFeePercent);

            // For single-hop: α = a·b·γ, β = a, ε = γ
            return {
                alpha: r0.multipliedBy(r1).multipliedBy(gamma),
                beta: r0,
                epsilon: gamma,
            };
        } else {
            // Multi-hop route
            // This is a simplified approximation for multi-hop paths
            let alpha = new BigNumber(1);
            let beta = new BigNumber(0);
            let epsilon = new BigNumber(1);

            for (let i = 0; i < path.length - 1; i++) {
                const tokenIn = path[i];
                const tokenOut = path[i + 1];
                const pair = this.getPairByTokens(pairs, tokenIn, tokenOut);

                if (!pair) {
                    throw new Error(
                        `Pool not found for path segment ${tokenIn}-${tokenOut}`,
                    );
                }

                const [reserves0, reserves1] = this.getOrderedReserves(
                    tokenIn,
                    pair,
                );
                const r0 = new BigNumber(reserves0);
                const r1 = new BigNumber(reserves1);
                const gamma = new BigNumber(1).minus(pair.totalFeePercent);

                if (i === 0) {
                    // First hop
                    alpha = r0.multipliedBy(r1).multipliedBy(gamma);
                    beta = r0;
                    epsilon = gamma;
                } else {
                    // Subsequent hops - approximation for multi-hop
                    alpha = alpha.multipliedBy(r1).multipliedBy(gamma);
                    epsilon = epsilon.multipliedBy(gamma);
                }
            }

            return { alpha, beta, epsilon };
        }
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

        if (phiSqrtAlpha.isLessThanOrEqualTo(beta)) {
            return new BigNumber(0);
        }

        return phiSqrtAlpha.minus(beta).dividedBy(epsilon);
    }

    /**
     * Find optimal phi value for Lagrange multiplier method
     */
    private findOptimalPhi(
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
    }

    /**
     * Compute allocations for routes with shared pools (fixed input)
     */
    private computeAllocationsWithSharedPoolsFixedInput(
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
                        addressRoute: this.getAddressRoute(pairs, paths[i]),
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
                for (let ratio = 0.1; ratio <= 0.9; ratio += 0.1) {
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
            const numSamples = Math.min(10, paths.length);

            // Only test a limited number of combinations to avoid excessive computation
            for (let i = 0; i < Math.min(5, paths.length); i++) {
                for (let j = i + 1; j < Math.min(6, paths.length); j++) {
                    for (let k = j + 1; k < Math.min(7, paths.length); k++) {
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
     * Compute optimal allocations for fixed output swaps
     */
    private async computeOptimalAllocationsFixedOutput(
        paths: string[][],
        pairs: PairModel[],
        amount: string,
        hasSharedPools: boolean,
    ): Promise<{
        allocations: ParallelRouteAllocation[];
        totalResult: string;
    }> {
        if (hasSharedPools) {
            // For shared pools use iterative approach
            return this.computeAllocationsWithSharedPoolsFixedOutput(
                paths,
                pairs,
                amount,
            );
        } else {
            // For independent pools, compute input needed for each route
            return this.computeAllocationsWithLagrangeFixedOutput(
                paths,
                pairs,
                amount,
            );
        }
    }

    /**
     * Compute optimal allocations for fixed output swaps using Lagrange
     */
    private computeAllocationsWithLagrangeFixedOutput(
        paths: string[][],
        pairs: PairModel[],
        amount: string,
    ): {
        allocations: ParallelRouteAllocation[];
        totalResult: string;
    } {
        // For fixed output, we aim to minimize total input
        // Compute required input for each route
        const routeInputs: Array<{
            path: string[];
            inputAmount: string;
            intermediaryAmounts: string[];
        }> = [];

        for (const path of paths) {
            try {
                const intermediaryAmounts =
                    this.computeIntermediaryAmountsFixedOutput(
                        path,
                        pairs,
                        amount,
                    );
                const inputAmount = intermediaryAmounts[0];

                // Skip routes that require infinite input
                if (
                    inputAmount !== 'Infinity' &&
                    new BigNumber(inputAmount).isGreaterThan(0)
                ) {
                    routeInputs.push({
                        path,
                        inputAmount,
                        intermediaryAmounts,
                    });
                }
            } catch (e) {
                // Skip routes that can't produce the desired output
                continue;
            }
        }

        if (routeInputs.length === 0) {
            throw new Error(
                'No valid routes found for the desired output amount',
            );
        }

        // Sort by input amount (we want to minimize input)
        routeInputs.sort((a, b) => {
            return new BigNumber(a.inputAmount).comparedTo(
                new BigNumber(b.inputAmount),
            );
        });

        // For fixed output, the best route is typically the one requiring least input
        const bestRoute = routeInputs[0];

        return {
            allocations: [
                {
                    tokenRoute: bestRoute.path,
                    addressRoute: this.getAddressRoute(pairs, bestRoute.path),
                    inputAmount: bestRoute.inputAmount,
                    outputAmount: amount,
                    intermediaryAmounts: bestRoute.intermediaryAmounts,
                },
            ],
            totalResult: bestRoute.inputAmount,
        };
    }

    /**
     * Compute allocations for routes with shared pools (fixed output)
     */
    private computeAllocationsWithSharedPoolsFixedOutput(
        paths: string[][],
        pairs: PairModel[],
        amount: string,
    ): {
        allocations: ParallelRouteAllocation[];
        totalResult: string;
    } {
        const totalOutput = new BigNumber(amount);
        let bestInput = new BigNumber(Infinity);
        let bestAllocations: ParallelRouteAllocation[] = [];

        // Try each route individually first
        for (const path of paths) {
            try {
                const singleRouteResult = this.allocateToSingleRoute(
                    path,
                    pairs,
                    amount,
                    SWAP_TYPE.fixedOutput,
                );

                const input = new BigNumber(singleRouteResult.totalResult);

                if (input.isLessThan(bestInput)) {
                    bestInput = input;
                    bestAllocations = singleRouteResult.allocations;
                }
            } catch (e) {
                // Skip invalid routes
                continue;
            }
        }

        // Helper to test a specific allocation distribution
        const testAllocation = (
            distribution: number[],
        ): {
            input: BigNumber;
            allocations: ParallelRouteAllocation[];
        } | null => {
            const sum = distribution.reduce((a, b) => a + b, 0);
            const normalized = distribution.map((d) => d / sum);
            const outputs = normalized.map((n) =>
                totalOutput.multipliedBy(n).toFixed(),
            );

            const routeAllocations: ParallelRouteAllocation[] = [];
            let totalInput = new BigNumber(0);

            for (let i = 0; i < paths.length; i++) {
                if (normalized[i] > 0) {
                    try {
                        const intermediaryAmounts =
                            this.computeIntermediaryAmountsFixedOutput(
                                paths[i],
                                pairs,
                                outputs[i],
                            );

                        const inputAmount = intermediaryAmounts[0];

                        // Skip infinite input routes
                        if (inputAmount === 'Infinity') {
                            return null;
                        }

                        const inputBN = new BigNumber(inputAmount);

                        routeAllocations.push({
                            tokenRoute: paths[i],
                            addressRoute: this.getAddressRoute(pairs, paths[i]),
                            inputAmount,
                            outputAmount: outputs[i],
                            intermediaryAmounts,
                        });

                        totalInput = totalInput.plus(inputBN);
                    } catch (e) {
                        return null;
                    }
                }
            }

            return {
                input: totalInput,
                allocations: routeAllocations,
            };
        };

        // Test combinations of 2 routes with various allocation ratios
        for (let i = 0; i < paths.length; i++) {
            for (let j = i + 1; j < paths.length; j++) {
                for (let ratio = 0.1; ratio <= 0.9; ratio += 0.1) {
                    const distribution = Array(paths.length).fill(0);
                    distribution[i] = ratio;
                    distribution[j] = 1 - ratio;

                    const result = testAllocation(distribution);

                    if (result && result.input.isLessThan(bestInput)) {
                        bestInput = result.input;
                        bestAllocations = result.allocations;
                    }
                }
            }
        }

        // Test combinations of 3 routes (if we have enough routes)
        if (paths.length >= 3) {
            const numSamples = Math.min(10, paths.length);

            for (let i = 0; i < Math.min(5, paths.length); i++) {
                for (let j = i + 1; j < Math.min(6, paths.length); j++) {
                    for (let k = j + 1; k < Math.min(7, paths.length); k++) {
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

                            if (result && result.input.isLessThan(bestInput)) {
                                bestInput = result.input;
                                bestAllocations = result.allocations;
                            }
                        }
                    }
                }
            }
        }

        return {
            allocations: bestAllocations,
            totalResult: bestInput.toFixed(),
        };
    }

    /**
     * Get a pair by its token identifiers
     */
    private getPairByTokens(
        pairs: PairModel[],
        tokenIn: string,
        tokenOut: string,
    ): PairModel | undefined {
        for (const pair of pairs) {
            if (
                (tokenIn === pair.firstToken.identifier &&
                    tokenOut === pair.secondToken.identifier) ||
                (tokenIn === pair.secondToken.identifier &&
                    tokenOut === pair.firstToken.identifier)
            ) {
                return pair;
            }
        }

        return undefined;
    }

    /**
     * Get ordered reserves based on input token
     */
    private getOrderedReserves(
        tokenInID: string,
        pair: PairModel,
    ): [string, string] {
        return tokenInID === pair.firstToken.identifier
            ? [pair.info.reserves0, pair.info.reserves1]
            : [pair.info.reserves1, pair.info.reserves0];
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
            const pair = this.getPairByTokens(pairs, tokenInID, tokenOutID);
            if (pair === undefined) {
                throw new Error(
                    `No pool found for tokens ${tokenInID}-${tokenOutID}`,
                );
            }

            const [tokenInReserves, tokenOutReserves] = this.getOrderedReserves(
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
            const pair = this.getPairByTokens(pairs, tokenInID, tokenOutID);
            if (pair === undefined) {
                throw new Error(
                    `No pool found for tokens ${tokenInID}-${tokenOutID}`,
                );
            }

            const [tokenInReserves, tokenOutReserves] = this.getOrderedReserves(
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
     * Get the address route (pool addresses) for a token route
     */
    private getAddressRoute(
        pairs: PairModel[],
        tokensRoute: string[],
    ): string[] {
        const addressRoute: string[] = [];

        for (let index = 0; index < tokensRoute.length - 1; index++) {
            const pair = this.getPairByTokens(
                pairs,
                tokensRoute[index],
                tokensRoute[index + 1],
            );
            if (pair === undefined) {
                throw new Error(
                    `No pool found for tokens ${tokensRoute[index]}-${
                        tokensRoute[index + 1]
                    }`,
                );
            }
            addressRoute.push(pair.address);
        }

        return addressRoute;
    }
}
