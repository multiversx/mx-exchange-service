import { Inject } from '@nestjs/common';
import { BigNumber } from 'bignumber.js';
import {
    Graph,
    GraphItem,
    QueueItem,
    PriorityQueue,
    PRIORITY_MODES,
} from './auto-router.utils';
import { PairModel } from 'src/modules/pair/models/pair.model';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { AutoRouteModel } from '../../models/auto-router.model';
import { ContextService } from 'src/services/context/context.service';
import { EsdtToken } from 'src/models/tokens/esdtToken.model';
import { PairGetterService } from 'src/modules/pair/services/pair.getter.service';
import { getAmountIn, getAmountOut } from 'src/modules/pair/pair.utils';

export class AutoRouterService {
    constructor(
        private readonly contextService: ContextService,
        private readonly pairGetterService: PairGetterService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    public async getAutoRouteFixedInput(
        amountIn: string,
        tokenInID: string,
        tokenOutID: string,
    ): Promise<AutoRouteModel> {
        const pairs: PairModel[] = await this.getAllActivePairs();

        try {
            const [tokenRoute, amountOut] = await this.computeBestSwapRoute(
                this.buildDijkstraGraph(pairs),
                tokenInID,
                tokenOutID,
                pairs,
                amountIn,
                PRIORITY_MODES.maxOutput,
            );

            return new AutoRouteModel({
                tokenInID: tokenInID,
                tokenOutID: tokenOutID,
                amountIn: amountIn,
                amountOut: new BigNumber(amountOut).toString(),
                tokenRoute: tokenRoute,
                addressRoute: this.getAddressRoute(pairs, tokenRoute),
            });
        } catch (error) {
            this.logger.error(
                'Error when computing the swap auto route.',
                error,
            );
        }
    }

    public async getAutoRouteFixedOutput(
        amountOut: string,
        tokenInID: string,
        tokenOutID: string,
    ): Promise<AutoRouteModel> {
        const pairs: PairModel[] = await this.getAllActivePairs();

        try {
            const [tokenRoute, amountIn] = await this.computeBestSwapRoute(
                this.buildDijkstraGraph(pairs),
                tokenOutID,
                tokenInID,
                pairs,
                amountOut,
                PRIORITY_MODES.minInput,
            );

            return new AutoRouteModel({
                tokenInID: tokenInID,
                tokenOutID: tokenOutID,
                amountIn: new BigNumber(amountIn).toString(),
                amountOut: amountOut,
                tokenRoute: tokenRoute,
                addressRoute: this.getAddressRoute(pairs, tokenRoute),
            });
        } catch (error) {
            this.logger.error(
                'Error when computing the swap auto route.',
                error,
            );
        }
    }

    /// Computes the best swap route (with max output / min input) using a converted Eager Dijkstra's algorithm
    private async computeBestSwapRoute(
        graph: Graph,
        s: string,
        d: string,
        pairs: PairModel[],
        amount: string,
        priorityMode: number,
    ): Promise<[string[], string]> {
        // Predecessor map for each node that has been encountered.
        // node ID => predecessor node ID
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
        let priorityQueue = new PriorityQueue(priorityMode);
        priorityQueue.push({
            tokenID: s,
            intermediaryAmount: amount,
            address: '',
        });

        let closest: QueueItem;
        let u: string;
        let v: string;
        let output_from_s_to_u: string;
        let adjacent_nodes: GraphItem;
        let output_of_e: string;

        while (!priorityQueue.empty()) {
            // In the nodes remaining in graph that have a known cost from s,
            // find the node, u, that currently has the shortest path from s.
            closest = priorityQueue.pop();
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
                    if (
                        priorityQueue.eagerPush(
                            {
                                tokenID: v,
                                intermediaryAmount: output_of_e,
                                address: currentPair.address,
                            },
                            costs[v],
                        )
                    ) {
                        costs[v] = output_of_e;
                        predecessors[v] = u;
                    }
                }
            }
        }

        if (typeof d !== 'undefined' && typeof costs[d] === 'undefined') {
            const msg = [
                'Could not find a path from ' + s,
                ' to ' + d,
                '.',
            ].join('');
            throw new Error(msg);
        }

        return [
            this.getNodeRouteFromPredecessors(predecessors, d, priorityMode),
            bestResult,
        ];
    }

    /// Returns node route from predecessors.
    private getNodeRouteFromPredecessors(
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

    private async getAllActivePairs() {
        let pairs: PairModel[] = [];

        const pairAddresses = await this.contextService.getAllPairsAddress();
        for (const pairAddress of pairAddresses) {
            const [
                pairMetadata,
                pairInfo,
                pairTotalFeePercent,
                pairState,
            ] = await Promise.all([
                this.contextService.getPairMetadata(pairAddress),
                this.pairGetterService.getPairInfoMetadata(pairAddress),
                this.pairGetterService.getTotalFeePercent(pairAddress),
                this.pairGetterService.getState(pairAddress),
            ]);

            if (pairState === 'Active')
                pairs.push(
                    new PairModel({
                        address: pairMetadata.address,
                        firstToken: new EsdtToken({
                            identifier: pairMetadata.firstTokenID,
                        }),
                        secondToken: new EsdtToken({
                            identifier: pairMetadata.secondTokenID,
                        }),
                        info: pairInfo,
                        totalFeePercent: pairTotalFeePercent,
                        state: pairState,
                    }),
                );
        }

        return pairs;
    }

    /// Converts a token route to an address route (e.g. ["MEX", "USDC", "RIDE"] => ["erd...", "erd..."])
    private getAddressRoute(pairs, tokenRoute) {
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
}
