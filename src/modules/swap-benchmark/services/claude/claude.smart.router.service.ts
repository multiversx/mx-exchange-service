import { Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { PairModel } from 'src/modules/pair/models/pair.model';
import { SWAP_TYPE } from 'src/modules/auto-router/models/auto-route.model';
import { ParallelRouteAllocation } from '../../models/models';

@Injectable()
export class ClaudeSmartRouterService {
    async computeBestSwapRoute(
        paths: string[][],
        pairs: PairModel[],
        amount: string,
        swapType: SWAP_TYPE,
        maxRoutes = 4,
    ): Promise<{
        allocations: ParallelRouteAllocation[];
        totalResult: string;
    }> {
        // Compute the best allocation across multiple routes
        if (swapType === SWAP_TYPE.fixedInput) {
            return this.computeOptimalRoutingForFixedInput(
                paths,
                pairs,
                amount,
                maxRoutes,
            );
        } else {
            return this.computeOptimalRoutingForFixedOutput(
                paths,
                pairs,
                amount,
                maxRoutes,
            );
        }
    }

    /**
     * Compute optimal routing for fixed input amount
     * @param paths Possible paths between source and destination tokens
     * @param pairs All available pairs
     * @param totalInputAmount Total input amount
     * @param maxRoutes Maximum number of parallel routes to consider
     * @returns Optimal routing result
     */
    private computeOptimalRoutingForFixedInput(
        paths: string[][],
        pairs: PairModel[],
        totalInputAmount: string,
        maxRoutes: number,
    ): { allocations: ParallelRouteAllocation[]; totalResult: string } {
        // Calculate route parameters for optimization
        const routes = this.calculateRouteParameters(paths, pairs);

        // Optimize allocation across routes using Lagrange Multipliers
        const allocations = this.optimizeAllocationWithLagrangeMultipliers(
            routes,
            totalInputAmount,
            maxRoutes,
        );

        // Calculate the expected output amounts and build the result
        return this.buildRoutingResult(
            routes,
            allocations,
            totalInputAmount,
            SWAP_TYPE.fixedInput,
        );
    }

    /**
     * Compute optimal routing for fixed output amount
     * @param paths Possible paths between source and destination tokens
     * @param pairs All available pairs
     * @param totalOutputAmount Total output amount
     * @param maxRoutes Maximum number of parallel routes to consider
     * @returns Optimal routing result
     */
    private computeOptimalRoutingForFixedOutput(
        paths: string[][],
        pairs: PairModel[],
        totalOutputAmount: string,
        maxRoutes: number,
    ): { allocations: ParallelRouteAllocation[]; totalResult: string } {
        // For fixed output, we compute how much input is needed for each route
        // to produce the required output, then optimize to minimize the total input
        // We can use a similar approach as fixed input but invert the optimization objective

        // This implementation is complex and would mirror the fixed input but with
        // different optimization goals - minimizing input instead of maximizing output

        // For the sake of this implementation, we'll focus on the fixed input case
        // and note that the fixed output would follow a similar pattern but inverted
        throw new Error('Fixed output routing not yet implemented');
    }

    /**
     * Calculate parameters for each route needed for optimization
     * Based on the formulas from the Smart Routing v2 paper
     * @param paths All possible paths
     * @param pairs All available pairs
     * @returns Array of route parameters
     */
    private calculateRouteParameters(
        paths: string[][],
        pairs: PairModel[],
    ): Array<{
        path: string[];
        poolAddresses: string[];
        alpha: BigNumber;
        beta: BigNumber;
        epsilon: BigNumber;
    }> {
        const routeParams = [];

        for (const path of paths) {
            if (path.length < 2) continue;

            // Get pool addresses for this path
            const poolAddresses = this.getPoolAddressesForPath(path, pairs);
            if (poolAddresses.length !== path.length - 1) continue; // Skip if any pool is missing

            // Calculate parameters based on path length
            if (path.length === 2) {
                // Single-hop path (direct swap)
                const pair = this.getPairByTokens(pairs, path[0], path[1]);
                if (!pair) continue;

                const [tokenInReserves, tokenOutReserves] =
                    this.getOrderedReserves(path[0], pair);
                const gamma = new BigNumber(1).minus(pair.totalFeePercent);

                // α = a·b·γ
                const alpha = new BigNumber(tokenInReserves)
                    .multipliedBy(tokenOutReserves)
                    .multipliedBy(gamma);

                // β = a
                const beta = new BigNumber(tokenInReserves);

                // ε = γ
                const epsilon = gamma;

                routeParams.push({
                    path,
                    poolAddresses,
                    alpha,
                    beta,
                    epsilon,
                });
            } else if (path.length === 3) {
                // Double-hop path (through one intermediate token)
                const pair1 = this.getPairByTokens(pairs, path[0], path[1]);
                const pair2 = this.getPairByTokens(pairs, path[1], path[2]);
                if (!pair1 || !pair2) continue;

                const [a1, c1] = this.getOrderedReserves(path[0], pair1);
                const [c2, b2] = this.getOrderedReserves(path[1], pair2);

                const gamma1 = new BigNumber(1).minus(pair1.totalFeePercent);
                const gamma2 = new BigNumber(1).minus(pair2.totalFeePercent);

                // α = a₁·c₁·c₂·b₂·γ₁·γ₂
                const alpha = new BigNumber(a1)
                    .multipliedBy(c1)
                    .multipliedBy(c2)
                    .multipliedBy(b2)
                    .multipliedBy(gamma1)
                    .multipliedBy(gamma2);

                // β = a₁·c₁
                const beta = new BigNumber(a1).multipliedBy(c1);

                // ε = c₂·γ₁ + c₁·γ₁·γ₂
                const epsilon = new BigNumber(c2)
                    .multipliedBy(gamma1)
                    .plus(
                        new BigNumber(c1)
                            .multipliedBy(gamma1)
                            .multipliedBy(gamma2),
                    );

                routeParams.push({
                    path,
                    poolAddresses,
                    alpha,
                    beta,
                    epsilon,
                });
            }
            // We could extend this for paths with more hops if needed
        }

        return routeParams;
    }

    /**
     * Optimize allocation across routes using Lagrange Multipliers
     * @param routes Route parameters
     * @param totalInputAmount Total input amount
     * @param maxRoutes Maximum number of routes to consider
     * @returns Map of allocations for each route
     */
    private optimizeAllocationWithLagrangeMultipliers(
        routes: Array<{
            path: string[];
            poolAddresses: string[];
            alpha: BigNumber;
            beta: BigNumber;
            epsilon: BigNumber;
        }>,
        totalInputAmount: string,
        maxRoutes: number,
    ): Map<string, string> {
        const totalInput = new BigNumber(totalInputAmount);
        const allocations = new Map<string, string>();

        // Sort routes by potential output (best routes first)
        const sortedRoutes = [...routes].sort((a, b) => {
            // Approximate the output for a very small input to rank the routes
            // This is a heuristic to identify the potentially best routes
            const outputA = a.alpha.dividedBy(
                a.beta.plus(a.epsilon.multipliedBy('0.001')),
            );
            const outputB = b.alpha.dividedBy(
                b.beta.plus(b.epsilon.multipliedBy('0.001')),
            );
            return outputB.comparedTo(outputA); // Descending order
        });

        // Limit to max routes
        const consideredRoutes = sortedRoutes.slice(0, maxRoutes);

        // Calculate phi (ϕ) parameter
        let phiNumerator = totalInput;
        let phiDenominator = new BigNumber(0);

        for (const route of consideredRoutes) {
            phiNumerator = phiNumerator.plus(
                route.beta.dividedBy(route.epsilon),
            );
            phiDenominator = phiDenominator.plus(
                route.alpha.sqrt().dividedBy(route.epsilon),
            );
        }

        const phi = phiNumerator.dividedBy(phiDenominator);

        // Calculate allocation for each route
        let remainingInput = totalInput;

        for (const route of consideredRoutes) {
            const pathKey = route.path.join('-');

            // Calculate allocation: Δai = (ϕ·√αi - βi)/εi
            let allocation = phi
                .multipliedBy(route.alpha.sqrt())
                .minus(route.beta)
                .dividedBy(route.epsilon);

            // Ensure allocation is non-negative
            if (allocation.isLessThanOrEqualTo(0)) {
                allocations.set(pathKey, '0');
                continue;
            }

            // Ensure we don't allocate more than the remaining input
            if (allocation.isGreaterThan(remainingInput)) {
                allocation = remainingInput;
            }

            allocations.set(pathKey, allocation.toString());
            remainingInput = remainingInput.minus(allocation);

            // If we've allocated all the input, stop
            if (remainingInput.isLessThanOrEqualTo(0)) {
                break;
            }
        }

        // If we have remaining input and at least one valid route, allocate it to the best route
        if (remainingInput.isGreaterThan(0) && allocations.size > 0) {
            const bestRouteKey = consideredRoutes[0].path.join('-');
            const currentAllocation = new BigNumber(
                allocations.get(bestRouteKey) || '0',
            );
            allocations.set(
                bestRouteKey,
                currentAllocation.plus(remainingInput).toString(),
            );
        }

        return allocations;
    }

    /**
     * Build the final routing result
     * @param routes Route parameters
     * @param allocations Allocated amounts for each route
     * @param totalInputAmount Total input amount
     * @param swapType Type of swap
     * @returns Optimal routing result
     */
    private buildRoutingResult(
        routes: Array<{
            path: string[];
            poolAddresses: string[];
            alpha: BigNumber;
            beta: BigNumber;
            epsilon: BigNumber;
        }>,
        allocations: Map<string, string>,
        totalInputAmount: string,
        swapType: SWAP_TYPE,
    ): { allocations: ParallelRouteAllocation[]; totalResult: string } {
        const result = {
            allocations: [],
            totalResult: '0',
        };

        let totalOutput = new BigNumber(0);

        for (const route of routes) {
            const pathKey = route.path.join('-');
            const allocation = allocations.get(pathKey);

            if (
                !allocation ||
                new BigNumber(allocation).isLessThanOrEqualTo(0)
            ) {
                continue;
            }

            // Calculate expected output based on route type and allocation
            let outputAmount: BigNumber;

            if (route.path.length === 2) {
                // Single-hop
                outputAmount = route.alpha
                    .multipliedBy(new BigNumber(allocation))
                    .dividedBy(
                        route.beta.plus(
                            route.epsilon.multipliedBy(
                                new BigNumber(allocation),
                            ),
                        ),
                    );
            } else {
                // Multi-hop
                outputAmount = route.alpha
                    .multipliedBy(new BigNumber(allocation))
                    .dividedBy(
                        route.beta
                            .multipliedBy(route.epsilon)
                            .plus(
                                route.beta.multipliedBy(
                                    new BigNumber(allocation),
                                ),
                            ),
                    );
            }

            // Calculate intermediary amounts
            const intermediaryAmounts = this.calculateIntermediaryAmounts(
                route.path,
                route.poolAddresses,
                allocation,
                outputAmount.toString(),
                swapType,
            );

            result.allocations.push({
                tokenRoute: route.path,
                addressRoute: route.poolAddresses,
                inputAmount: allocation,
                outputAmount: outputAmount.toString(),
                intermediaryAmounts,
            });

            totalOutput = totalOutput.plus(outputAmount);
        }

        result.totalResult = totalOutput.toString();

        return result;
    }

    /**
     * Calculate intermediary amounts for a route
     * @param path Token path
     * @param poolAddresses Pool addresses
     * @param inputAmount Input amount
     * @param outputAmount Output amount
     * @param swapType Swap type
     * @returns Array of intermediary amounts including input and output
     */
    private calculateIntermediaryAmounts(
        path: string[],
        poolAddresses: string[],
        inputAmount: string,
        outputAmount: string,
        swapType: SWAP_TYPE,
    ): string[] {
        // For a simple implementation, we'll just return the input and output for now
        // In a production environment, you would calculate actual intermediary amounts
        // by simulating the swaps along the path

        if (path.length === 2) {
            // For single hop, just return input and output
            return [inputAmount, outputAmount];
        } else if (path.length === 3) {
            // For double hop, we simulate an intermediary amount
            // In reality, you would need to calculate this based on pool reserves
            // This is a simplified approach
            const inputBN = new BigNumber(inputAmount);
            const outputBN = new BigNumber(outputAmount);
            const approxIntermediary = inputBN
                .plus(outputBN)
                .dividedBy(2)
                .integerValue()
                .toFixed();

            return [inputAmount, approxIntermediary, outputAmount];
        } else {
            // For more complex paths, you would need to simulate each step
            // This is a placeholder implementation
            const amounts = [inputAmount];

            // Add approximate intermediary values
            for (let i = 1; i < path.length - 1; i++) {
                const factor = i / (path.length - 1);
                const inputBN = new BigNumber(inputAmount);
                const outputBN = new BigNumber(outputAmount);
                const approxAmount = inputBN
                    .multipliedBy(1 - factor)
                    .plus(outputBN.multipliedBy(factor))
                    .integerValue()
                    .toFixed();
                amounts.push(approxAmount);
            }

            amounts.push(outputAmount);
            return amounts;
        }
    }

    /**
     * Get pool addresses for a path
     * @param path Token path
     * @param pairs All available pairs
     * @returns Array of pool addresses
     */
    private getPoolAddressesForPath(
        path: string[],
        pairs: PairModel[],
    ): string[] {
        const addresses = [];

        for (let i = 0; i < path.length - 1; i++) {
            const pair = this.getPairByTokens(pairs, path[i], path[i + 1]);
            if (!pair) return [];
            addresses.push(pair.address);
        }

        return addresses;
    }

    /**
     * Get a pair by token identifiers
     * @param pairs All available pairs
     * @param tokenIn First token identifier
     * @param tokenOut Second token identifier
     * @returns PairModel or undefined if not found
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
     * Get ordered reserves for a token pair
     * @param tokenInID Input token identifier
     * @param pair Pair model
     * @returns Ordered reserves [tokenInReserves, tokenOutReserves]
     */
    private getOrderedReserves(
        tokenInID: string,
        pair: PairModel,
    ): [string, string] {
        return tokenInID === pair.firstToken.identifier
            ? [pair.info.reserves0, pair.info.reserves1]
            : [pair.info.reserves1, pair.info.reserves0];
    }
}
