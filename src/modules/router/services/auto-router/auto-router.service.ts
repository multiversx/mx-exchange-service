import { Inject } from '@nestjs/common';
import { BigNumber } from 'bignumber.js';
import {
    MaxPriorityQueue,
    Graph,
    GraphItem,
    QueueItem,
} from './auto-router.utils';
import { PairModel } from 'src/modules/pair/models/pair.model';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { AutoRouteModel } from '../../models/auto-router.model';
import { ContextService } from 'src/services/context/context.service';
import { EsdtToken } from 'src/models/tokens/esdtToken.model';
import { PairGetterService } from 'src/modules/pair/services/pair.getter.service';
import { getAmountOut } from 'src/modules/pair/pair.utils';

export class AutoRouterService {
    constructor(
        private readonly contextService: ContextService,
        private readonly pairGetterService: PairGetterService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    public async getAutoRoute(
        amount: string,
        tokenInID: string,
        tokenOutID: string,
    ): Promise<AutoRouteModel> {
        const pairs: PairModel[] = await this.getAllPairs();

        try {
            const [
                predecessors,
                amountOut,
            ] = await this.computeMaxOutputSwapRoute(
                this.buildDijkstraGraph(pairs),
                tokenInID,
                tokenOutID,
                pairs,
                amount,
            );

            const tokenRoute = this.getNodeRouteFromPredecessors(
                predecessors,
                tokenOutID,
            );

            return new AutoRouteModel({
                tokenInID: tokenInID,
                tokenOutID: tokenOutID,
                amountIn: amount,
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

    /// Computes the swap route with max output using a converted Eager Dijkstra's algorithm
    private async computeMaxOutputSwapRoute(
        graph: Graph,
        s: string,
        d: string,
        pairs: PairModel[],
        inputAmount: string,
    ): Promise<[Record<string, string>, string]> {
        // Predecessor map for each node that has been encountered.
        // node ID => predecessor node ID
        const predecessors: Record<string, string> = {};

        // Costs of shortest paths from s to all nodes encountered.
        // node ID => cost
        const costs: Record<string, string> = {};
        costs[s] = '0';

        // Max possible value as best output since now
        let maximumAmountOut = '0';

        // Costs of shortest paths from s to all nodes encountered; differs from
        // `costs` in that it provides easy access to the node that currently has
        // the known shortest path from s.
        let maxPriorityQueue = new MaxPriorityQueue();
        maxPriorityQueue.push({
            tokenID: s,
            intermediaryAmount: inputAmount,
            address: '',
        });

        let closest: QueueItem;
        let u: string;
        let v: string;
        let output_from_s_to_u: string;
        let adjacent_nodes: GraphItem;
        let output_of_e: string;

        while (!maxPriorityQueue.empty()) {
            // In the nodes remaining in graph that have a known cost from s,
            // find the node, u, that currently has the shortest path from s.
            closest = maxPriorityQueue.pop();
            u = closest.tokenID;

            // Save the best output, if a better one was found
            if (
                u == d &&
                new BigNumber(closest.intermediaryAmount).isGreaterThan(
                    maximumAmountOut,
                )
            )
                maximumAmountOut = closest.intermediaryAmount;

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

                    // apply pair fees & exchange rate (maybe here can be used the official 'getAmountOut' Query)
                    switch (u) {
                        case currentPair.firstToken.identifier: {
                            output_of_e = await getAmountOut(
                                output_from_s_to_u,
                                currentPair.info.reserves0,
                                currentPair.info.reserves1,
                                currentPair.totalFeePercent,
                            ).toFixed();
                            break;
                        }
                        case currentPair.secondToken.identifier: {
                            output_of_e = await getAmountOut(
                                output_from_s_to_u,
                                currentPair.info.reserves1,
                                currentPair.info.reserves0,
                                currentPair.totalFeePercent,
                            ).toFixed();
                            break;
                        }
                        default: {
                            output_of_e = new BigNumber(0).toFixed();
                            break;
                        }
                    }

                    // if best cost yet => push cost to Dijkstra's max priority queue
                    // and then save cost & predecessor
                    if (
                        maxPriorityQueue.eagerPush(
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

        return [predecessors, maximumAmountOut];
    }

    /// Returns node route from predecessors.
    private getNodeRouteFromPredecessors(
        predecessors: Record<string, string>,
        d: string,
    ): string[] {
        const nodes: string[] = [];
        let u: string = d;
        let predecessor: string;
        while (u) {
            nodes.push(u);
            predecessor = predecessors[u];
            u = predecessors[u];
        }
        nodes.reverse();
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

    private async getAllPairs() {
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
