import BigNumber from 'bignumber.js';
import { PairModel } from 'src/modules/pair/models/pair.model';
import { getAmountIn, getAmountOut } from 'src/modules/pair/pair.utils';
import {
    PriorityQueue,
    MinPriorityQueue,
    MaxPriorityQueue,
    IGetCompareValue,
} from '@datastructures-js/priority-queue';

export const PRIORITY_MODES = {
    fixedOutputMinInput: 0,
    fixedInputMaxOutput: 1,
};

interface IRouteNode {
    intermediaryAmount: string;
    outputAmount: string;
    tokenID: string;
    address: string;
}

type Graph = Record<string, GraphItem>;
type GraphItem = Record<
    string,
    {
        address: string;
    }
>;

export type BestSwapRoute = {
    tokenRoute: string[];
    intermediaryAmounts: string[];
    addressRoute: string[];
    bestCost: string;
};

/// Modified eager Dijkstra's algorithm inspired from https://github.com/tcort/dijkstrajs
export class AutoRouterComputeService {
    /// Computes the best swap route (with max output / min input) using a converted Eager Dijkstra's algorithm
    async computeBestSwapRoute(
        s: string,
        d: string,
        pairs: PairModel[],
        amount: string,
        priorityMode: number,
    ): Promise<BestSwapRoute> {
        // Predecessor map for each node that has been encountered.
        // node ID => predecessor node ID
        const graph: Graph = this.buildDijkstraGraph(pairs);
        const predecessors: string[] = [];

        // Costs of shortest paths from s to all nodes encountered.
        // node ID => cost
        const costs: Record<string, string> = {};
        costs[s] = '0';

        // Initial best output
        let bestCost = this.getDefaultCost(priorityMode);

        // Costs of shortest paths from s to all nodes encountered; differs from
        // `costs` in that it provides easy access to the node that currently has
        // the known shortest path from s.
        let priorityQueue = this.getNewPriorityQueue(priorityMode, [
            {
                tokenID: s,
                intermediaryAmount: amount,
                outputAmount: '0',
                address: '',
            },
        ]);

        let closest: IRouteNode;
        let u: string;
        let v: string;
        let output_from_s_to_u: string;
        let adjacent_nodes: GraphItem;
        let cost_of_edge: string;

        while (!priorityQueue.isEmpty()) {
            // In the nodes remaining in graph that have a known cost from s,
            // find the node, u, that currently has the best cost from s.
            closest = priorityQueue.dequeue();
            u = closest.tokenID;

            // Save the best output, if a better one was found
            if (u === d) {
                if (
                    this.isBetterCost(
                        bestCost,
                        closest.outputAmount,
                        priorityMode,
                    )
                ) {
                    bestCost = closest.outputAmount;
                }
            } else {
                // Get nodes adjacent to u...
                adjacent_nodes = graph[u] || {};

                // ...and explore the edges that connect u to those nodes, updating
                // the cost of the shortest paths to any or all of those nodes as
                // necessary. v is the node across the current edge from u.
                for (v in adjacent_nodes) {
                    if (adjacent_nodes.hasOwnProperty(v)) {
                        const currentPair = pairs.find(
                            p => p.address === adjacent_nodes[v].address,
                        );

                        output_from_s_to_u = closest.intermediaryAmount;

                        cost_of_edge = this.computeSwapOutput(
                            currentPair,
                            u,
                            output_from_s_to_u,
                            priorityMode,
                        );

                        if (
                            priorityMode === PRIORITY_MODES.fixedOutputMinInput
                        ) {
                            const isEnoughLiquidity: boolean = this.isEnoughLiquidityForFixedOutput(
                                u,
                                output_from_s_to_u,
                                currentPair,
                            );

                            if (!isEnoughLiquidity) {
                                priorityQueue = this.removeFromPriorityQueueByAddress(
                                    priorityQueue,
                                    currentPair.address,
                                    priorityMode,
                                );
                                continue;
                            }
                        }

                        const newNode: IRouteNode = {
                            tokenID: v,
                            intermediaryAmount: cost_of_edge,
                            outputAmount:
                                v === d
                                    ? cost_of_edge
                                    : this.getDefaultCost(priorityMode),
                            address: currentPair.address,
                        };

                        const pushed: boolean = this.tryEagerPush(
                            priorityQueue,
                            priorityMode,
                            newNode,
                            costs[v],
                        );

                        // If better node cost, push cost to priority queue, save cost & save predecessors
                        if (pushed) {
                            priorityQueue.enqueue(newNode);
                            costs[v] = cost_of_edge;
                            predecessors[v] = u;
                        }
                    }
                }
            }
        }

        if (typeof costs[d] === 'undefined') {
            throw new Error(`Could not find a path from ${s} to ${d}`);
        }

        const tokenRoute = this.computeNodeRoute(predecessors, d, priorityMode);

        return {
            tokenRoute,
            intermediaryAmounts: this.computeIntermediaryAmounts(
                tokenRoute,
                costs,
                amount,
                bestCost,
                priorityMode,
            ),
            addressRoute: this.computeSCRouteFromNodeRoute(pairs, tokenRoute),
            bestCost,
        };
    }

    private tryEagerPush(
        priorityQueue: PriorityQueue<IRouteNode>,
        priorityMode: number,
        newNode: IRouteNode,
        currentCost: string,
    ): boolean {
        const [
            queue,
            isNewNodeBetterThanOldValues,
        ] = this.removeLessGoodQueueCosts(
            priorityQueue.toArray(),
            newNode,
            priorityMode,
        );

        priorityQueue = this.getNewPriorityQueue(priorityMode, queue);

        const isNewNodeANewSolution: boolean =
            typeof currentCost === 'undefined' ||
            (priorityMode === PRIORITY_MODES.fixedInputMaxOutput &&
                new BigNumber(currentCost).isLessThan(newNode.outputAmount)) ||
            (priorityMode === PRIORITY_MODES.fixedOutputMinInput &&
                new BigNumber(currentCost).isGreaterThan(newNode.outputAmount));

        return isNewNodeBetterThanOldValues || isNewNodeANewSolution;
    }

    /// Parses queue & removes less good costs while a better cost is not found in the queue
    private removeLessGoodQueueCosts(
        queue: IRouteNode[],
        newNode: IRouteNode,
        priorityMode: number,
    ): [IRouteNode[], boolean] {
        let foundLessGoodValue = false;
        let foundBetterValue = false;

        for (let i = queue.length - 1; i >= 0; --i) {
            if (queue[i].tokenID === newNode.tokenID) {
                if (
                    (priorityMode === PRIORITY_MODES.fixedInputMaxOutput &&
                        new BigNumber(queue[i].outputAmount).isLessThan(
                            newNode.outputAmount,
                        )) ||
                    (priorityMode === PRIORITY_MODES.fixedOutputMinInput &&
                        new BigNumber(queue[i].outputAmount).isGreaterThan(
                            newNode.outputAmount,
                        ))
                ) {
                    queue.splice(i, 1);
                    foundLessGoodValue = true;
                } else if (
                    (priorityMode === PRIORITY_MODES.fixedInputMaxOutput &&
                        new BigNumber(
                            queue[i].outputAmount,
                        ).isGreaterThanOrEqualTo(newNode.outputAmount)) ||
                    (priorityMode === PRIORITY_MODES.fixedOutputMinInput &&
                        new BigNumber(
                            queue[i].outputAmount,
                        ).isLessThanOrEqualTo(newNode.outputAmount))
                ) {
                    foundBetterValue = true;
                    break;
                }
            }
        }

        const isNewNodeBetterThanOldValues: boolean =
            foundLessGoodValue && !foundBetterValue;

        return [queue, isNewNodeBetterThanOldValues];
    }

    private buildDijkstraGraph(pairs: PairModel[]): Graph {
        return pairs.reduce((acc, pair) => {
            const token1ID = pair.firstToken.identifier;
            const token2ID = pair.secondToken.identifier;
            const initialValue = {
                intermediaryAmount: 0,
                outputAmount: 0,
                address: pair.address,
            };
            acc[token1ID] = acc.hasOwnProperty(token1ID)
                ? { ...acc[token1ID] }
                : {};
            acc[token1ID][token2ID] = initialValue;
            acc[token2ID] = acc.hasOwnProperty(token2ID)
                ? { ...acc[token2ID] }
                : {};
            acc[token2ID][token1ID] = initialValue;
            return acc;
        }, {});
    }

    /// Returns node route from predecessors.
    private computeNodeRoute(
        predecessors: string[],
        d: string,
        priorityMode: number,
    ): string[] {
        const nodes: string[] = [];
        let u: string = d;
        let predecessor: string;

        while (u) {
            nodes.push(u);
            predecessor = predecessors[u];
            u = predecessors[u];
        }

        if (priorityMode === PRIORITY_MODES.fixedInputMaxOutput)
            nodes.reverse();

        return nodes;
    }

    /// Converts a token route to a SC address route (e.g. ["MEX", "USDC", "RIDE"] => ["erd...", "erd..."])
    private computeSCRouteFromNodeRoute(pairs, tokenRoute) {
        let addressRoute = [];

        const length = tokenRoute.length;
        for (let i = 1; i < length; i++) {
            const tokenID1 = tokenRoute[i];
            const tokenID2 = tokenRoute[i - 1];

            const pair = pairs
                .filter(
                    p =>
                        p.firstToken.identifier == tokenID1 ||
                        p.secondToken.identifier == tokenID1,
                )
                .filter(
                    p =>
                        p.firstToken.identifier == tokenID2 ||
                        p.secondToken.identifier == tokenID2,
                )[0];

            addressRoute.push(pair.address);
        }
        return addressRoute;
    }

    private computeIntermediaryAmounts(
        tokenRoute: string[],
        costs: Record<string, string>,
        amount: string,
        bestCost: string,
        priorityMode: number,
    ): string[] {
        let intermediaryAmounts: string[] = [];

        intermediaryAmounts.push(
            priorityMode === PRIORITY_MODES.fixedInputMaxOutput
                ? amount
                : bestCost,
        );

        const midRangeEnd = tokenRoute.length - 1;
        for (let i = 1; i < midRangeEnd; i++) {
            intermediaryAmounts.push(costs[tokenRoute[i]]);
        }

        intermediaryAmounts.push(
            priorityMode === PRIORITY_MODES.fixedInputMaxOutput
                ? bestCost
                : amount,
        );

        return intermediaryAmounts;
    }

    private getNewPriorityQueue(
        priorityMode: number,
        array: IRouteNode[] = [],
    ): PriorityQueue<IRouteNode> {
        const routeNodeCompareValue: IGetCompareValue<IRouteNode> = node =>
            node.outputAmount;

        return priorityMode === PRIORITY_MODES.fixedInputMaxOutput
            ? MaxPriorityQueue.fromArray(array, routeNodeCompareValue)
            : MinPriorityQueue.fromArray(array, routeNodeCompareValue);
    }

    private removeFromPriorityQueueByAddress(
        priorityQueue: PriorityQueue<IRouteNode>,
        address: string,
        priorityMode: number,
    ): PriorityQueue<IRouteNode> {
        const filteredQueue = priorityQueue
            .toArray()
            .filter(e => e.address !== address);
        return this.getNewPriorityQueue(priorityMode, filteredQueue);
    }

    private computeSwapOutput(
        pair: PairModel,
        sourceTokenId: string,
        amount: string,
        priorityMode: number,
    ): string {
        switch (sourceTokenId) {
            case pair.firstToken.identifier: {
                if (priorityMode === PRIORITY_MODES.fixedInputMaxOutput)
                    return getAmountOut(
                        amount,
                        pair.info.reserves0,
                        pair.info.reserves1,
                        pair.totalFeePercent,
                    ).toFixed();
                else
                    return getAmountIn(
                        amount,
                        pair.info.reserves1,
                        pair.info.reserves0,
                        pair.totalFeePercent,
                    ).toFixed();
            }
            case pair.secondToken.identifier: {
                if (priorityMode === PRIORITY_MODES.fixedInputMaxOutput)
                    return getAmountOut(
                        amount,
                        pair.info.reserves1,
                        pair.info.reserves0,
                        pair.totalFeePercent,
                    ).toFixed();
                else
                    return getAmountIn(
                        amount,
                        pair.info.reserves0,
                        pair.info.reserves1,
                        pair.totalFeePercent,
                    ).toFixed();
            }
            default: {
                return this.getDefaultCost(priorityMode);
            }
        }
    }

    private isEnoughLiquidityForFixedOutput(
        inputTokenID: string,
        amount: string,
        pair: PairModel,
    ): boolean {
        return (
            (pair.firstToken.identifier === inputTokenID &&
                new BigNumber(pair.info.reserves0).isGreaterThanOrEqualTo(
                    amount,
                )) ||
            (pair.secondToken.identifier === inputTokenID &&
                new BigNumber(pair.info.reserves1).isGreaterThanOrEqualTo(
                    amount,
                ))
        );
    }

    private getDefaultCost(priorityMode: number): string {
        return priorityMode === PRIORITY_MODES.fixedInputMaxOutput
            ? '0'
            : new BigNumber(Number.POSITIVE_INFINITY).toString();
    }

    private isBetterCost(
        bestCost: string,
        newCost: string,
        priorityMode: number,
    ): boolean {
        return (
            (priorityMode === PRIORITY_MODES.fixedInputMaxOutput &&
                new BigNumber(newCost).isGreaterThan(bestCost)) ||
            (priorityMode === PRIORITY_MODES.fixedOutputMinInput &&
                new BigNumber(newCost).isLessThan(bestCost))
        );
    }
}
