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
    minInput: 0,
    maxOutput: 1,
};
interface IRouteNode {
    intermediaryAmount: string;
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
export class AutoRouterComputeService {
    /// Computes the best swap route (with max output / min input) using a converted Eager Dijkstra's algorithm
    public async computeBestSwapRoute(
        s: string,
        d: string,
        pairs: PairModel[],
        amount: string,
        priorityMode: number,
    ): Promise<[string[], string[], string]> {
        // Predecessor map for each node that has been encountered.
        // node ID => predecessor node ID
        const graph: Graph = this.buildDijkstraGraph(pairs);
        const predecessors: string[] = [];

        // Costs of shortest paths from s to all nodes encountered.
        // node ID => cost
        const costs: Record<string, string> = {};
        costs[s] = '0';

        // Initial best output
        let bestResult =
            priorityMode == PRIORITY_MODES.maxOutput
                ? '0'
                : new BigNumber(Number.POSITIVE_INFINITY).toString();

        // Costs of shortest paths from s to all nodes encountered; differs from
        // `costs` in that it provides easy access to the node that currently has
        // the known shortest path from s.
        let priorityQueue = this.getNewPriorityQueue(priorityMode);
        priorityQueue.enqueue({
            tokenID: s,
            intermediaryAmount: amount,
            address: '',
        });

        let closest: IRouteNode;
        let u: string;
        let v: string;
        let output_from_s_to_u: string;
        let adjacent_nodes: GraphItem;
        let output_of_e: string;

        while (!priorityQueue.isEmpty()) {
            // In the nodes remaining in graph that have a known cost from s,
            // find the node, u, that currently has the shortest path from s.
            closest = priorityQueue.dequeue();
            u = closest.tokenID;

            // Save the best output, if a better one was found
            if (u == d) {
                if (
                    (priorityMode == PRIORITY_MODES.maxOutput &&
                        new BigNumber(closest.intermediaryAmount).isGreaterThan(
                            bestResult,
                        )) ||
                    (priorityMode == PRIORITY_MODES.minInput &&
                        new BigNumber(closest.intermediaryAmount).isLessThan(
                            bestResult,
                        ))
                ) {
                    bestResult = closest.intermediaryAmount;
                }
            }

            // Get nodes adjacent to u...
            adjacent_nodes = graph[u] || {};

            // ...and explore the edges that connect u to those nodes, updating
            // the cost of the shortest paths to any or all of those nodes as
            // necessary. v is the node across the current edge from u.
            for (v in adjacent_nodes) {
                if (adjacent_nodes.hasOwnProperty(v)) {
                    // get current pair
                    const currentPair = pairs.filter(
                        p => p.address == adjacent_nodes[v].address,
                    )[0];

                    output_from_s_to_u = closest.intermediaryAmount;

                    switch (u) {
                        case currentPair.firstToken.identifier: {
                            if (priorityMode === PRIORITY_MODES.maxOutput)
                                output_of_e = await getAmountOut(
                                    output_from_s_to_u,
                                    currentPair.info.reserves0,
                                    currentPair.info.reserves1,
                                    currentPair.totalFeePercent,
                                ).toFixed();
                            else
                                output_of_e = await getAmountIn(
                                    output_from_s_to_u,
                                    currentPair.info.reserves1,
                                    currentPair.info.reserves0,
                                    currentPair.totalFeePercent,
                                ).toFixed();
                            break;
                        }
                        case currentPair.secondToken.identifier: {
                            if (priorityMode === PRIORITY_MODES.maxOutput)
                                output_of_e = await getAmountOut(
                                    output_from_s_to_u,
                                    currentPair.info.reserves1,
                                    currentPair.info.reserves0,
                                    currentPair.totalFeePercent,
                                ).toFixed();
                            else
                                output_of_e = await getAmountIn(
                                    output_from_s_to_u,
                                    currentPair.info.reserves0,
                                    currentPair.info.reserves1,
                                    currentPair.totalFeePercent,
                                ).toFixed();
                            break;
                        }
                        default: {
                            output_of_e =
                                priorityMode == PRIORITY_MODES.maxOutput
                                    ? '0'
                                    : new BigNumber(
                                          Number.POSITIVE_INFINITY,
                                      ).toString();
                            break;
                        }
                    }

                    // if best cost yet => push cost to Dijkstra's max priority queue
                    // and then save cost & predecessor
                    let pushed = false;
                    [priorityQueue, pushed] = this.eagerPush(
                        priorityQueue,
                        priorityMode,
                        {
                            tokenID: v,
                            intermediaryAmount: output_of_e,
                            address: currentPair.address,
                        },
                        costs[v],
                    );

                    if (pushed) {
                        costs[v] = output_of_e;
                        predecessors[v] = u;
                    }
                }
            }
        }

        if (typeof costs[d] === 'undefined') {
            const msg = [
                'Could not find a path from ' + s,
                ' to ' + d,
                '.',
            ].join('');
            throw new Error(msg);
        }

        const tokenRoute = this.computeNodeRouteFromPredecessors(
            predecessors,
            d,
            priorityMode,
        );

        return [
            tokenRoute,
            this.computeSCRouteFromNodeRoute(pairs, tokenRoute),
            bestResult,
        ];
    }

    private eagerPush(
        priorityQueue: PriorityQueue<IRouteNode>,
        priorityMode: number,
        newItem: IRouteNode,
        currentCost: string,
    ): [PriorityQueue<IRouteNode>, boolean] {
        let foundLessGoodValue = false;
        let foundBetterValue = false;

        let queue = priorityQueue.toArray();

        // parse queue, remove less good costs & add the current cost if it's the best one yet
        for (let i = queue.length - 1; i >= 0; --i) {
            if (queue[i].tokenID == newItem.tokenID) {
                if (
                    (priorityMode === PRIORITY_MODES.maxOutput &&
                        queue[i].intermediaryAmount <
                            newItem.intermediaryAmount) ||
                    (priorityMode === PRIORITY_MODES.minInput &&
                        queue[i].intermediaryAmount <
                            newItem.intermediaryAmount)
                ) {
                    // delete old cost because is less good
                    queue.splice(i, 1);
                    foundLessGoodValue = true;
                } else {
                    // better cost found => break
                    foundBetterValue = true;
                    break;
                }
            }
        }

        priorityQueue = this.getNewPriorityQueue(priorityMode, queue);

        // if better cost || first push
        if (
            (foundLessGoodValue && !foundBetterValue) ||
            typeof currentCost === 'undefined'
        ) {
            priorityQueue.enqueue(newItem);
            return [priorityQueue, true];
        }

        return [priorityQueue, false];
    }

    private buildDijkstraGraph(pairs: PairModel[]) {
        return pairs.reduce((acc, pair) => {
            const token1ID = pair.firstToken.identifier;
            const token2ID = pair.secondToken.identifier;
            const initialValue = {
                finalAmount: 0,
                intermediaryAmount: 0,
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
    private computeNodeRouteFromPredecessors(
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

        if (priorityMode === PRIORITY_MODES.maxOutput) nodes.reverse();

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

    private getNewPriorityQueue(
        priorityMode: number,
        array: IRouteNode[] = [],
    ): PriorityQueue<IRouteNode> {
        const routeNodeCompareValue: IGetCompareValue<IRouteNode> = node =>
            node.intermediaryAmount;

        return priorityMode === PRIORITY_MODES.maxOutput
            ? MaxPriorityQueue.fromArray(array, routeNodeCompareValue)
            : MinPriorityQueue.fromArray(array, routeNodeCompareValue);
    }
}
