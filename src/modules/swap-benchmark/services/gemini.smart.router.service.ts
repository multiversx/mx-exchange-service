import BigNumber from 'bignumber.js';
import { SWAP_TYPE } from 'src/modules/auto-router/models/auto-route.model';
import { PairModel } from 'src/modules/pair/models/pair.model';
import { ParallelRouteAllocation } from '../models/models';
import { getAmountIn, getAmountOut } from 'src/modules/pair/pair.utils';
import { constantsConfig } from 'src/config';
import { getOrderedReserves } from '../router.utils';

// --- Helper Interfaces ---

interface SimulatedPair extends PairModel {
    simulatedReserves0: BigNumber;
    simulatedReserves1: BigNumber;
}

interface PathDetails {
    tokenRoute: string[];
    addressRoute: string[];
    pairs: SimulatedPair[]; // The specific pair instances for this path with simulated reserves
}

// --- Improved Auto Router Service ---

export class GeminiSmartRouterService {
    // Number of steps for the iterative allocation. Higher means more accuracy but more computation.
    private readonly ITERATION_STEPS = 100;

    // --- Public Method ---

    async computeBestSwapRoute(
        paths: string[][],
        initialPairs: PairModel[],
        amount: string,
        swapType: SWAP_TYPE,
    ): Promise<{
        allocations: ParallelRouteAllocation[];
        totalResult: string;
    }> {
        // Ensure initialPairs is actually provided
        if (!initialPairs || initialPairs.length === 0) {
            console.error('Initial pairs array is missing or empty.');
            throw new Error('Initial pairs array must be provided.');
        }

        // 1. Prepare simulated pairs map (used by buildPathDetails)
        const simulatedPairsMap = this.createSimulatedPairsMap(initialPairs);
        // 2. Build path details using the map (linking paths to simulated pair objects)
        const validPathDetails = this.buildPathDetails(
            paths,
            simulatedPairsMap,
        );

        if (validPathDetails.length === 0) {
            throw new Error('No valid routes found or routes exceed max depth');
        }

        // 3. Perform iterative allocation using the path details (which contain simulated pairs)
        let allocationsMap: Map<string, ParallelRouteAllocation>;
        let totalResult: BigNumber;

        if (swapType === SWAP_TYPE.fixedInput) {
            // Pass only pathDetails; shared state is managed via the objects within it
            allocationsMap = this.computeAllocationsFixedInput(
                validPathDetails,
                new BigNumber(amount),
            );
            // Final calculation uses initialPairs data
            this.recalculateFinalAllocationsFixedInput(
                allocationsMap,
                initialPairs,
            ); // Pass initialPairs here
            totalResult = this.calculateTotalOutput(allocationsMap);
        } else {
            // SWAP_TYPE.fixedOutput
            // Pass only pathDetails; shared state is managed via the objects within it
            allocationsMap = this.computeAllocationsFixedOutput(
                validPathDetails,
                new BigNumber(amount),
            );
            // Final calculation uses initialPairs data
            this.recalculateFinalAllocationsFixedOutput(
                allocationsMap,
                initialPairs,
            ); // Pass initialPairs here
            totalResult = this.calculateTotalInput(allocationsMap);
        }

        // 4. Format results
        const finalAllocations = Array.from(allocationsMap.values()).filter(
            (alloc) =>
                // Filter out allocations that effectively became invalid (e.g., Infinity input) or zero
                (new BigNumber(alloc.inputAmount).gt(0) &&
                    new BigNumber(alloc.inputAmount).isFinite()) ||
                new BigNumber(alloc.outputAmount).gt(0),
        );

        // Sort allocations for consistency (optional, e.g., by output amount descending for fixedInput)
        if (swapType === SWAP_TYPE.fixedInput) {
            finalAllocations.sort((a, b) =>
                new BigNumber(b.outputAmount).comparedTo(a.outputAmount),
            );
        } else {
            finalAllocations.sort((a, b) => {
                const inputA = new BigNumber(a.inputAmount);
                const inputB = new BigNumber(b.inputAmount);
                // Handle Infinity sorting: finite inputs come first
                if (!inputA.isFinite() && inputB.isFinite()) return 1;
                if (inputA.isFinite() && !inputB.isFinite()) return -1;
                if (!inputA.isFinite() && !inputB.isFinite()) return 0; // Keep order if both are Infinity
                return inputA.comparedTo(inputB); // Sort by input asc for fixedOutput
            });
        }

        return {
            allocations: finalAllocations,
            totalResult: totalResult.isFinite()
                ? totalResult.toFixed(0)
                : 'Infinity', // Return as integer string or Infinity
        };
    }

    // --- Core Logic: Fixed Input ---

    private computeAllocationsFixedInput(
        pathDetails: PathDetails[],
        totalAmountIn: BigNumber,
    ): Map<string, ParallelRouteAllocation> {
        const allocations = new Map<string, ParallelRouteAllocation>();
        const amountDelta = totalAmountIn.gt(0)
            ? totalAmountIn.dividedBy(this.ITERATION_STEPS)
            : new BigNumber(0);

        if (amountDelta.lte(0)) {
            return allocations;
        }

        pathDetails.forEach((pd) => {
            allocations.set(pd.addressRoute.join('-'), {
                tokenRoute: pd.tokenRoute,
                addressRoute: pd.addressRoute,
                inputAmount: '0',
                outputAmount: '0',
                intermediaryAmounts: [
                    '0',
                    ...new Array(pd.tokenRoute.length - 1).fill('0'),
                ],
            });
        });

        for (let i = 0; i < this.ITERATION_STEPS; i++) {
            let bestPathIndex = -1;
            let maxMarginalOutput = new BigNumber(-1);

            for (let j = 0; j < pathDetails.length; j++) {
                try {
                    const marginalOutput = this.getMarginalAmountOut(
                        pathDetails[j],
                        amountDelta,
                    );
                    if (marginalOutput.gt(maxMarginalOutput)) {
                        maxMarginalOutput = marginalOutput;
                        bestPathIndex = j;
                    }
                } catch (error) {
                    continue;
                }
            }

            if (bestPathIndex === -1 || maxMarginalOutput.lte(0)) {
                break;
            }

            const bestPath = pathDetails[bestPathIndex];
            try {
                this.updateSimulatedReservesFixedInput(bestPath, amountDelta);
                const currentAlloc = allocations.get(
                    bestPath.addressRoute.join('-'),
                );
                currentAlloc.inputAmount = new BigNumber(
                    currentAlloc.inputAmount,
                )
                    .plus(amountDelta)
                    .toFixed(0);
                currentAlloc.outputAmount = new BigNumber(
                    currentAlloc.outputAmount,
                )
                    .plus(maxMarginalOutput)
                    .toFixed(0);
            } catch (updateError) {
                // console.warn(`Error updating reserves for path ${bestPathIndex}, stopping allocation for this path?`);
                // Decide how to handle update errors, e.g., remove path or just stop allocating to it.
                // For simplicity, we just continue to the next iteration potentially skipping this path.
                continue;
            }
        }
        return allocations;
    }

    // --- Core Logic: Fixed Output ---

    private computeAllocationsFixedOutput(
        pathDetails: PathDetails[],
        totalAmountOut: BigNumber,
    ): Map<string, ParallelRouteAllocation> {
        const allocations = new Map<string, ParallelRouteAllocation>();
        const amountDelta = totalAmountOut.gt(0)
            ? totalAmountOut.dividedBy(this.ITERATION_STEPS)
            : new BigNumber(0);

        if (amountDelta.lte(0)) {
            return allocations;
        }

        pathDetails.forEach((pd) => {
            allocations.set(pd.addressRoute.join('-'), {
                tokenRoute: pd.tokenRoute,
                addressRoute: pd.addressRoute,
                inputAmount: '0',
                outputAmount: '0',
                intermediaryAmounts: [
                    ...new Array(pd.tokenRoute.length).fill('0'),
                ],
            });
        });

        for (let i = 0; i < this.ITERATION_STEPS; i++) {
            let bestPathIndex = -1;
            let minMarginalInput = new BigNumber(Infinity);

            for (let j = 0; j < pathDetails.length; j++) {
                try {
                    const marginalInput = this.getMarginalAmountIn(
                        pathDetails[j],
                        amountDelta,
                    );
                    if (
                        marginalInput.gt(0) &&
                        marginalInput.lt(minMarginalInput)
                    ) {
                        minMarginalInput = marginalInput;
                        bestPathIndex = j;
                    }
                } catch (error) {
                    continue;
                }
            }

            if (
                bestPathIndex === -1 ||
                !minMarginalInput.isFinite() ||
                minMarginalInput.lte(0)
            ) {
                break;
            }

            const bestPath = pathDetails[bestPathIndex];
            try {
                this.updateSimulatedReservesFixedOutput(bestPath, amountDelta);
                const currentAlloc = allocations.get(
                    bestPath.addressRoute.join('-'),
                );
                currentAlloc.outputAmount = new BigNumber(
                    currentAlloc.outputAmount,
                )
                    .plus(amountDelta)
                    .toFixed(0);
                currentAlloc.inputAmount = new BigNumber(
                    currentAlloc.inputAmount,
                )
                    .plus(minMarginalInput)
                    .toFixed(0);
            } catch (updateError) {
                // console.warn(`Error updating reserves for path ${bestPathIndex} (fixed output), stopping allocation for this path?`);
                continue; // Continue to next iteration, potentially skipping this path
            }
        }
        return allocations;
    }

    private recalculateFinalAllocationsFixedInput(
        allocationsMap: Map<string, ParallelRouteAllocation>,
        initialPairs: PairModel[], // Parameter needed here
    ): void {
        allocationsMap.forEach((alloc) => {
            if (new BigNumber(alloc.inputAmount).gt(0)) {
                const { finalOutputAmount, finalIntermediaryAmounts } =
                    this.calculatePathOutputWithIntermediaries(
                        initialPairs, // Pass it down
                        alloc.tokenRoute,
                        alloc.inputAmount,
                    );
                alloc.outputAmount = finalOutputAmount.toFixed(0);
                alloc.intermediaryAmounts = finalIntermediaryAmounts;
            } else {
                alloc.outputAmount = '0';
                alloc.intermediaryAmounts = [
                    '0',
                    ...new Array(alloc.tokenRoute.length - 1).fill('0'),
                ];
            }
        });
    }

    private recalculateFinalAllocationsFixedOutput(
        allocationsMap: Map<string, ParallelRouteAllocation>,
        initialPairs: PairModel[], // Parameter needed here
    ): void {
        allocationsMap.forEach((alloc) => {
            if (new BigNumber(alloc.outputAmount).gt(0)) {
                const { finalInputAmount, finalIntermediaryAmounts } =
                    this.calculatePathInputWithIntermediaries(
                        initialPairs, // Pass it down
                        alloc.tokenRoute,
                        alloc.outputAmount,
                    );
                alloc.inputAmount = finalInputAmount.isFinite()
                    ? finalInputAmount.toFixed(0)
                    : 'Infinity';
                alloc.intermediaryAmounts = finalIntermediaryAmounts;
                if (!finalInputAmount.isFinite()) {
                    alloc.outputAmount = '0'; // Reset output if input is impossible
                }
            } else {
                alloc.inputAmount = '0';
                alloc.intermediaryAmounts = [
                    ...new Array(alloc.tokenRoute.length).fill('0'),
                ];
            }
        });
    }

    // --- Calculation Helpers ---

    private calculateTotalOutput(
        allocationsMap: Map<string, ParallelRouteAllocation>,
    ): BigNumber {
        let totalOutput = new BigNumber(0);
        allocationsMap.forEach((alloc) => {
            totalOutput = totalOutput.plus(alloc.outputAmount);
        });
        return totalOutput;
    }

    private calculateTotalInput(
        allocationsMap: Map<string, ParallelRouteAllocation>,
    ): BigNumber {
        let totalInput = new BigNumber(0);
        allocationsMap.forEach((alloc) => {
            const input = new BigNumber(alloc.inputAmount);
            if (input.isFinite() && input.gt(0)) {
                // Only sum valid, finite inputs
                totalInput = totalInput.plus(input);
            }
        });
        // If no valid path was found, totalInput might still be 0.
        // If some paths were invalid ('Infinity'), the total might represent only partial fulfillment.
        // Consider returning Infinity if the target output wasn't fully met across valid paths.
        // For simplicity here, we sum finite inputs. Check if total output matches desired?
        return totalInput; // May need refinement based on how 'Infinity' inputs are handled
    }

    // Calculate marginal output for a small input delta on a specific path
    private getMarginalAmountOut(
        path: PathDetails,
        amountInDelta: BigNumber,
    ): BigNumber {
        let currentAmount = amountInDelta;
        for (let i = 0; i < path.pairs.length; i++) {
            const pair = path.pairs[i];
            const tokenInID = path.tokenRoute[i];
            const [reservesIn, reservesOut] = this.getSimulatedReserves(
                tokenInID,
                pair,
            );

            // Check for zero reserves before division
            if (reservesIn.lte(0) || reservesOut.lte(0)) {
                // console.warn(`Zero reserves encountered in path ${path.tokenRoute.join('->')} at hop ${i}`);
                throw new Error(
                    `Zero reserves in pair ${pair.address} for hop ${i}`,
                );
            }

            currentAmount = getAmountOut(
                currentAmount.toFixed(), // Use full precision string
                reservesIn.toFixed(),
                reservesOut.toFixed(),
                pair.totalFeePercent,
            );
            if (currentAmount.lte(0)) {
                // console.warn(`Amount out became zero or negative in path ${path.tokenRoute.join('->')} at hop ${i}`);
                throw new Error(
                    `Output is zero or less for hop ${i} in path ${path.tokenRoute.join(
                        '->',
                    )}`,
                );
            }
        }
        return currentAmount; // This is the output for the delta input
    }

    // Calculate marginal input required for a small output delta on a specific path
    private getMarginalAmountIn(
        path: PathDetails,
        amountOutDelta: BigNumber,
    ): BigNumber {
        let currentAmount = amountOutDelta;
        for (let i = path.pairs.length - 1; i >= 0; i--) {
            const pair = path.pairs[i];
            const tokenInID = path.tokenRoute[i]; // Input token for this specific hop

            const [reservesIn, reservesOut] = this.getSimulatedReserves(
                tokenInID,
                pair,
            );

            // Check reserves before calculation
            if (reservesIn.lte(0) || reservesOut.lte(0)) {
                throw new Error(
                    `Zero reserves in pair ${pair.address} for hop ${i}`,
                );
            }
            if (reservesOut.lt(currentAmount)) {
                throw new Error(
                    `Insufficient reserves out (${reservesOut.toFixed()}) for desired amount (${currentAmount.toFixed()}) in pair ${
                        pair.address
                    } for hop ${i}`,
                );
            }

            currentAmount = getAmountIn(
                currentAmount.toFixed(), // Use full precision string
                reservesIn.toFixed(),
                reservesOut.toFixed(),
                pair.totalFeePercent,
            );

            if (currentAmount.lte(0) || !currentAmount.isFinite()) {
                throw new Error(
                    `Required input is zero, negative, or infinite for hop ${i} in path ${path.tokenRoute.join(
                        '->',
                    )}`,
                );
            }
        }
        return currentAmount; // This is the input required for the delta output
    }

    // Updates the simulated reserves for pairs in a path after a fixed input allocation
    private updateSimulatedReservesFixedInput(
        path: PathDetails,
        amountInDelta: BigNumber,
    ): void {
        let currentAmount = amountInDelta;
        for (let i = 0; i < path.pairs.length; i++) {
            const pair = path.pairs[i];
            const tokenInID = path.tokenRoute[i];
            const [reservesIn, reservesOut] = this.getSimulatedReserves(
                tokenInID,
                pair,
            );

            // Recalculate amount out based on current reserves for accurate update
            const amountOutActual = getAmountOut(
                currentAmount.toFixed(),
                reservesIn.toFixed(),
                reservesOut.toFixed(),
                pair.totalFeePercent,
            );

            if (amountOutActual.lte(0)) {
                // console.error(`Cannot update reserves for path ${path.tokenRoute.join('->')}: hop ${i} results in zero output.`);
                // Potentially stop updates or throw, depending on desired strictness
                return;
            }

            // Update reserves
            const newReservesIn = reservesIn.plus(currentAmount);
            const newReservesOut = reservesOut.minus(amountOutActual);

            if (newReservesOut.lt(0)) {
                // This shouldn't happen with correct getAmountOut logic, but check defensively
                console.error(
                    `Error updating reserves: output reserves became negative for pair ${pair.address}`,
                );
                return;
            }

            // Apply updates back to the pair object
            if (tokenInID === pair.firstToken.identifier) {
                pair.simulatedReserves0 = newReservesIn;
                pair.simulatedReserves1 = newReservesOut;
            } else {
                pair.simulatedReserves1 = newReservesIn;
                pair.simulatedReserves0 = newReservesOut;
            }

            currentAmount = amountOutActual; // The output of this hop is the input for the next
        }
    }

    // Updates the simulated reserves for pairs in a path after a fixed output allocation
    private updateSimulatedReservesFixedOutput(
        path: PathDetails,
        amountOutDelta: BigNumber,
    ): void {
        let currentOutputTarget = amountOutDelta;
        const inputs: BigNumber[] = []; // Store inputs calculated backward

        // First pass: Calculate inputs required at each step backward
        for (let i = path.pairs.length - 1; i >= 0; i--) {
            const pair = path.pairs[i];
            const tokenInID = path.tokenRoute[i];
            const [reservesIn, reservesOut] = this.getSimulatedReserves(
                tokenInID,
                pair,
            );

            if (reservesOut.lt(currentOutputTarget)) {
                console.error(
                    `Cannot update reserves for fixed output: Insufficient reserves (${reservesOut.toFixed()}) for target (${currentOutputTarget.toFixed()}) in pair ${
                        pair.address
                    }`,
                );
                throw new Error(
                    'Insufficient reserves during fixed output update',
                );
            }

            const amountInRequired = getAmountIn(
                currentOutputTarget.toFixed(),
                reservesIn.toFixed(),
                reservesOut.toFixed(),
                pair.totalFeePercent,
            );

            if (amountInRequired.lte(0) || !amountInRequired.isFinite()) {
                console.error(
                    `Cannot update reserves for fixed output: Required input is not positive finite for pair ${pair.address}`,
                );
                throw new Error(
                    'Invalid input required during fixed output update',
                );
            }

            inputs.unshift(amountInRequired); // Store input for this hop
            currentOutputTarget = amountInRequired; // This input becomes the target output for the previous hop
        }

        // Second pass: Update reserves forward using calculated inputs
        let currentInput = inputs[0]; // Start with the input for the first hop
        for (let i = 0; i < path.pairs.length; i++) {
            const pair = path.pairs[i];
            const tokenInID = path.tokenRoute[i];
            const [reservesIn, reservesOut] = this.getSimulatedReserves(
                tokenInID,
                pair,
            );

            // Calculate the actual output for this specific input amount
            const actualAmountOut = getAmountOut(
                currentInput.toFixed(),
                reservesIn.toFixed(),
                reservesOut.toFixed(),
                pair.totalFeePercent,
            );

            // Update reserves
            const newReservesIn = reservesIn.plus(currentInput);
            const newReservesOut = reservesOut.minus(actualAmountOut);

            if (newReservesOut.lt(0)) {
                console.error(
                    `Error updating reserves (fixed output): output reserves became negative for pair ${pair.address}`,
                );
                return;
            }

            // Apply updates back
            if (tokenInID === pair.firstToken.identifier) {
                pair.simulatedReserves0 = newReservesIn;
                pair.simulatedReserves1 = newReservesOut;
            } else {
                pair.simulatedReserves1 = newReservesIn;
                pair.simulatedReserves0 = newReservesOut;
            }

            // Set input for the next hop
            if (i + 1 < inputs.length) {
                currentInput = inputs[i + 1]; // Use the pre-calculated input for the next stage
                // Sanity check: actualAmountOut should ideally equal inputs[i+1] if calculations are precise
                // if (!actualAmountOut.isEqualTo(inputs[i+1])) { console.warn("Mismatch in fixed output update"); }
            }
        }
    }

    // Calculates the final output and all intermediary amounts for a given path and total input
    // private calculatePathOutputWithIntermediaries(
    //     initialPairs: PairModel[], // Use original non-simulated pairs data
    //     tokenRoute: string[],
    //     totalInputAmount: string,
    // ): { finalOutputAmount: BigNumber; finalIntermediaryAmounts: string[] } {
    //     const pathAmounts: string[] = [totalInputAmount];
    //     let currentAmount = new BigNumber(totalInputAmount);
    //     const pairsMap = this.createSimulatedPairsMap(initialPairs); // Fresh map for calculation

    //     for (let i = 0; i < tokenRoute.length - 1; i++) {
    //         const tokenInID = tokenRoute[i];
    //         const tokenOutID = tokenRoute[i + 1];
    //         const pair = this.findPairByTokens(
    //             initialPairs,
    //             tokenInID,
    //             tokenOutID,
    //         );

    //         if (!pair) {
    //             console.error(
    //                 `Critical error: Pair not found for ${tokenInID} -> ${tokenOutID} during final calculation.`,
    //             );
    //             // Return zero/error state if a pair is missing mid-route
    //             return {
    //                 finalOutputAmount: new BigNumber(0),
    //                 finalIntermediaryAmounts: pathAmounts.concat(
    //                     new Array(tokenRoute.length - 1 - i).fill('0'),
    //                 ),
    //             };
    //         }

    //         const [reservesIn, reservesOut] = getOrderedReserves(
    //             tokenInID,
    //             pair,
    //         ); // Use actual reserves

    //         if (
    //             new BigNumber(reservesIn).lte(0) ||
    //             new BigNumber(reservesOut).lte(0) ||
    //             currentAmount.lte(0)
    //         ) {
    //             // Stop if reserves are zero or input becomes zero
    //             return {
    //                 finalOutputAmount: new BigNumber(0),
    //                 finalIntermediaryAmounts: pathAmounts.concat(
    //                     new Array(tokenRoute.length - 1 - i).fill('0'),
    //                 ),
    //             };
    //         }

    //         const amountOut = getAmountOut(
    //             currentAmount.toFixed(),
    //             reservesIn,
    //             reservesOut,
    //             pair.totalFeePercent,
    //         );

    //         if (amountOut.lte(0)) {
    //             // Stop calculation if output becomes zero
    //             return {
    //                 finalOutputAmount: new BigNumber(0),
    //                 finalIntermediaryAmounts: pathAmounts.concat(
    //                     new Array(tokenRoute.length - 1 - i).fill('0'),
    //                 ),
    //             };
    //         }

    //         pathAmounts.push(amountOut.toFixed(0));
    //         currentAmount = amountOut;
    //     }

    //     return {
    //         finalOutputAmount: currentAmount,
    //         finalIntermediaryAmounts: pathAmounts,
    //     };
    // }

    private calculatePathOutputWithIntermediaries(
        initialPairs: PairModel[], // Use original data
        tokenRoute: string[],
        totalInputAmount: string,
    ): { finalOutputAmount: BigNumber; finalIntermediaryAmounts: string[] } {
        const pathAmounts: string[] = [totalInputAmount];
        let currentAmount = new BigNumber(totalInputAmount);
        if (currentAmount.lte(0)) {
            return {
                finalOutputAmount: new BigNumber(0),
                finalIntermediaryAmounts: new Array(tokenRoute.length).fill(
                    '0',
                ),
            };
        }
        for (let i = 0; i < tokenRoute.length - 1; i++) {
            const tokenInID = tokenRoute[i];
            const tokenOutID = tokenRoute[i + 1];
            const pair = this.findPairByTokens(
                initialPairs,
                tokenInID,
                tokenOutID,
            ); // Find original pair
            if (!pair) {
                const Z = new Array(tokenRoute.length - 1 - i).fill('0');
                return {
                    finalOutputAmount: new BigNumber(0),
                    finalIntermediaryAmounts: [...pathAmounts, ...Z],
                };
            }
            const [reservesIn, reservesOut] = getOrderedReserves(
                tokenInID,
                pair,
            ); // Use original reserves
            if (
                new BigNumber(reservesIn).lte(0) ||
                new BigNumber(reservesOut).lte(0)
            ) {
                const Z = new Array(tokenRoute.length - 1 - i).fill('0');
                return {
                    finalOutputAmount: new BigNumber(0),
                    finalIntermediaryAmounts: [...pathAmounts, ...Z],
                };
            }
            const amountOut = getAmountOut(
                currentAmount.toFixed(),
                reservesIn,
                reservesOut,
                pair.totalFeePercent,
            );
            if (amountOut.lte(0)) {
                const Z = new Array(tokenRoute.length - 1 - i).fill('0');
                return {
                    finalOutputAmount: new BigNumber(0),
                    finalIntermediaryAmounts: [...pathAmounts, ...Z],
                };
            }
            pathAmounts.push(amountOut.toFixed(0));
            currentAmount = amountOut;
        }
        return {
            finalOutputAmount: currentAmount,
            finalIntermediaryAmounts: pathAmounts,
        };
    }

    // Calculates the final input and all intermediary amounts for a given path and total output
    // private calculatePathInputWithIntermediaries(
    //     initialPairs: PairModel[],
    //     tokenRoute: string[],
    //     totalOutputAmount: string,
    // ): { finalInputAmount: BigNumber; finalIntermediaryAmounts: string[] } {
    //     const pathAmounts: string[] = [totalOutputAmount];
    //     let currentAmount = new BigNumber(totalOutputAmount);

    //     if (currentAmount.lte(0)) {
    //         return {
    //             finalInputAmount: new BigNumber(0),
    //             finalIntermediaryAmounts: new Array(tokenRoute.length).fill(
    //                 '0',
    //             ),
    //         };
    //     }

    //     for (let i = tokenRoute.length - 1; i > 0; i--) {
    //         const tokenInID = tokenRoute[i - 1];
    //         const tokenOutID = tokenRoute[i];
    //         const pair = this.findPairByTokens(
    //             initialPairs,
    //             tokenInID,
    //             tokenOutID,
    //         );

    //         if (!pair) {
    //             console.error(
    //                 `Critical error: Pair not found for ${tokenInID} -> ${tokenOutID} during final fixed output calculation.`,
    //             );
    //             return {
    //                 finalInputAmount: new BigNumber(Infinity),
    //                 finalIntermediaryAmounts: ['Infinity'].concat(pathAmounts),
    //             };
    //         }

    //         const [reservesIn, reservesOut] = getOrderedReserves(
    //             tokenInID,
    //             pair,
    //         );

    //         if (
    //             new BigNumber(reservesIn).lte(0) ||
    //             new BigNumber(reservesOut).lte(0)
    //         ) {
    //             return {
    //                 finalInputAmount: new BigNumber(Infinity),
    //                 finalIntermediaryAmounts: ['Infinity'].concat(pathAmounts),
    //             };
    //         }
    //         if (new BigNumber(reservesOut).lt(currentAmount)) {
    //             return {
    //                 finalInputAmount: new BigNumber(Infinity),
    //                 finalIntermediaryAmounts: ['Infinity'].concat(pathAmounts),
    //             };
    //         }

    //         const amountIn = getAmountIn(
    //             currentAmount.toFixed(),
    //             reservesIn,
    //             reservesOut,
    //             pair.totalFeePercent,
    //         );

    //         if (amountIn.lte(0) || !amountIn.isFinite()) {
    //             return {
    //                 finalInputAmount: new BigNumber(Infinity),
    //                 finalIntermediaryAmounts: ['Infinity'].concat(pathAmounts),
    //             };
    //         }

    //         pathAmounts.unshift(amountIn.toFixed(0));
    //         currentAmount = amountIn;
    //     }

    //     return {
    //         finalInputAmount: currentAmount,
    //         finalIntermediaryAmounts: pathAmounts,
    //     };
    // }

    private calculatePathInputWithIntermediaries(
        initialPairs: PairModel[], // Use original data
        tokenRoute: string[],
        totalOutputAmount: string,
    ): { finalInputAmount: BigNumber; finalIntermediaryAmounts: string[] } {
        const pathAmounts: string[] = [totalOutputAmount];
        let currentAmount = new BigNumber(totalOutputAmount);
        if (currentAmount.lte(0)) {
            return {
                finalInputAmount: new BigNumber(0),
                finalIntermediaryAmounts: new Array(tokenRoute.length).fill(
                    '0',
                ),
            };
        }
        for (let i = tokenRoute.length - 1; i > 0; i--) {
            const tokenInID = tokenRoute[i - 1];
            const tokenOutID = tokenRoute[i];
            const pair = this.findPairByTokens(
                initialPairs,
                tokenInID,
                tokenOutID,
            ); // Find original pair
            if (!pair) {
                const I = new Array(i).fill('Infinity');
                return {
                    finalInputAmount: new BigNumber(Infinity),
                    finalIntermediaryAmounts: [...I, ...pathAmounts],
                };
            }
            const [reservesIn, reservesOut] = getOrderedReserves(
                tokenInID,
                pair,
            ); // Use original reserves
            if (
                new BigNumber(reservesIn).lte(0) ||
                new BigNumber(reservesOut).lte(0)
            ) {
                const I = new Array(i).fill('Infinity');
                return {
                    finalInputAmount: new BigNumber(Infinity),
                    finalIntermediaryAmounts: [...I, ...pathAmounts],
                };
            }
            if (new BigNumber(reservesOut).lt(currentAmount)) {
                const I = new Array(i).fill('Infinity');
                return {
                    finalInputAmount: new BigNumber(Infinity),
                    finalIntermediaryAmounts: [...I, ...pathAmounts],
                };
            }
            const amountIn = getAmountIn(
                currentAmount.toFixed(),
                reservesIn,
                reservesOut,
                pair.totalFeePercent,
            );
            if (amountIn.lte(0) || !amountIn.isFinite()) {
                const I = new Array(i).fill('Infinity');
                return {
                    finalInputAmount: new BigNumber(Infinity),
                    finalIntermediaryAmounts: [...I, ...pathAmounts],
                };
            }
            pathAmounts.unshift(amountIn.toFixed(0));
            currentAmount = amountIn;
        }
        return {
            finalInputAmount: currentAmount,
            finalIntermediaryAmounts: pathAmounts,
        };
    }

    // --- Initialization and Setup ---

    // Creates a map of pair address to SimulatedPair object
    private createSimulatedPairsMap(
        initialPairs: PairModel[],
    ): Map<string, SimulatedPair> {
        const map = new Map<string, SimulatedPair>();
        initialPairs.forEach((pair) => {
            // Deep copy essential parts to avoid modifying original data
            map.set(pair.address, {
                ...pair, // Shallow copy other properties
                firstToken: { ...pair.firstToken }, // Copy token details
                secondToken: { ...pair.secondToken },
                info: { ...pair.info }, // Copy info
                // Initialize simulated reserves from actual reserves
                simulatedReserves0: new BigNumber(pair.info.reserves0),
                simulatedReserves1: new BigNumber(pair.info.reserves1),
            });
        });
        return map;
    }

    // Builds the PathDetails structure for each valid path
    private buildPathDetails(
        paths: string[][],
        simulatedPairsMap: Map<string, SimulatedPair>,
    ): PathDetails[] {
        const validPathDetails: PathDetails[] = [];

        for (const tokenRoute of paths) {
            if (
                tokenRoute.length < 2 ||
                tokenRoute.length > constantsConfig.MAX_SWAP_ROUTE_DEPTH + 1
            ) {
                // console.log(`Skipping path: Invalid length ${tokenRoute.length}`, tokenRoute);
                continue; // Skip paths that are too short or too long
            }

            const routePairs: SimulatedPair[] = [];
            const addressRoute: string[] = [];
            let isValidPath = true;

            for (let i = 0; i < tokenRoute.length - 1; i++) {
                const tokenInID = tokenRoute[i];
                const tokenOutID = tokenRoute[i + 1];
                const pair = this.findPairByTokensFromMap(
                    simulatedPairsMap,
                    tokenInID,
                    tokenOutID,
                );

                if (!pair) {
                    // console.log(`Skipping path: No pair found for ${tokenInID} -> ${tokenOutID}`, tokenRoute);
                    isValidPath = false;
                    break; // Stop processing this path if a pair is missing
                }
                // Check initial liquidity
                const [reserves0, reserves1] = [
                    new BigNumber(pair.info.reserves0),
                    new BigNumber(pair.info.reserves1),
                ];
                if (reserves0.lte(0) || reserves1.lte(0)) {
                    // console.log(`Skipping path: Zero initial liquidity in pair ${pair.address} for ${tokenInID} -> ${tokenOutID}`, tokenRoute);
                    isValidPath = false;
                    break; // Skip path if any pool starts with zero liquidity
                }

                routePairs.push(pair);
                addressRoute.push(pair.address);
            }

            if (isValidPath) {
                validPathDetails.push({
                    tokenRoute,
                    addressRoute,
                    pairs: routePairs,
                });
            }
        }
        return validPathDetails;
    }

    // --- Utility Methods ---

    // Finds a pair from the map using token identifiers
    private findPairByTokensFromMap(
        pairsMap: Map<string, SimulatedPair>,
        tokenIn: string,
        tokenOut: string,
    ): SimulatedPair | undefined {
        // Since we assume only one pool per pair, iterating the map values is feasible.
        // If performance is critical and map lookups are frequent,
        // consider an additional index Map<string, string> mapping 'tokenA-tokenB' keys to pair addresses.
        for (const pair of pairsMap.values()) {
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

    // Finds a pair from the initial list (used for final calculations)
    private findPairByTokens(
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

    // Gets simulated reserves in the correct order [reservesIn, reservesOut]
    private getSimulatedReserves(
        tokenInID: string,
        pair: SimulatedPair,
    ): [BigNumber, BigNumber] {
        return tokenInID === pair.firstToken.identifier
            ? [pair.simulatedReserves0, pair.simulatedReserves1]
            : [pair.simulatedReserves1, pair.simulatedReserves0];
    }
}
