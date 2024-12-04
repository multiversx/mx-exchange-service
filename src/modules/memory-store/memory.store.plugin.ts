import {
    ApolloServerPlugin,
    GraphQLRequestListener,
    GraphQLResponse,
} from '@apollo/server';
import { Plugin } from '@nestjs/apollo';
import { FieldNode, Kind, SelectionNode } from 'graphql';
import { PairMemoryStoreService } from './services/pair.memory.store.service';
import {
    extractFilteredQueryEdgeNodes,
    extractQueryFields,
    parseArguments,
    updateFilteredQueryEdgeNodes,
} from './utils/graphql.utils';
import { QueryField } from './entities/query.field.type';
// import { CpuProfiler } from '@multiversx/sdk-nestjs-monitoring';
// import { PerformanceProfiler } from 'src/utils/performance.profiler';
// import { MetricsCollector } from 'src/utils/metrics.collector';

@Plugin()
export class MemoryStoreApolloPlugin implements ApolloServerPlugin {
    constructor(private readonly pairMemoryStore: PairMemoryStoreService) {}

    async requestDidStart(): Promise<GraphQLRequestListener<any>> {
        const pairMemoryStore = this.pairMemoryStore;
        let allPairsQueries: {
            queryName: string;
            queryAlias: string;
            isFiltered: boolean;
            identifierField: string;
            requestedFields: QueryField[];
            arguments: Record<string, any>;
        }[] = [];

        return {
            async responseForOperation(
                requestContext,
            ): Promise<GraphQLResponse | null> {
                try {
                    if (!pairMemoryStore.isReady()) {
                        return null;
                    }

                    const targetedQueries = Object.keys(
                        PairMemoryStoreService.targetedQueries,
                    );

                    const requestQueries =
                        requestContext.operation.selectionSet.selections;

                    const normalSelections: SelectionNode[] = [];
                    for (const selection of requestQueries) {
                        if (
                            selection.kind !== Kind.FIELD ||
                            !targetedQueries.includes(selection.name.value)
                        ) {
                            normalSelections.push(selection);
                            continue;
                        }

                        const { missingFields, isFiltered, identifierField } =
                            PairMemoryStoreService.targetedQueries[
                                selection.name.value
                            ];

                        const actualNodes = isFiltered
                            ? extractFilteredQueryEdgeNodes(
                                  selection.selectionSet?.selections,
                              )
                            : selection.selectionSet?.selections;

                        const initialSelectionNodes: SelectionNode[] = [];
                        const storeSelectionNodes: SelectionNode[] = [];
                        let identifierNode: FieldNode;
                        for (const node of actualNodes) {
                            if (node.kind !== Kind.FIELD) {
                                initialSelectionNodes.push(node);
                                continue;
                            }

                            const requestedMissingField = missingFields.find(
                                (missingField) =>
                                    missingField.name === node.name.value,
                            );

                            if (requestedMissingField) {
                                initialSelectionNodes.push(node);
                                continue;
                            }

                            if (node.name.value === identifierField) {
                                identifierNode = node;
                            }

                            storeSelectionNodes.push(node);
                        }

                        if (storeSelectionNodes.length > 0) {
                            allPairsQueries.push({
                                queryName: selection.name.value,
                                queryAlias: selection.alias?.value,
                                requestedFields:
                                    extractQueryFields(storeSelectionNodes),
                                arguments: parseArguments(
                                    selection.arguments,
                                    requestContext.request.variables,
                                ),
                                isFiltered: isFiltered,
                                identifierField,
                            });
                        }

                        if (initialSelectionNodes.length > 0) {
                            // if filtered - update the edges.node field of the original set
                            // otherwise update original selection set

                            if (identifierNode === undefined) {
                                // identifier node was never requested
                                // TODO needs to be added and removed in willSendResponse!
                            } else {
                                // add to normal nodes
                                initialSelectionNodes.push(identifierNode);
                            }

                            selection.selectionSet.selections = isFiltered
                                ? updateFilteredQueryEdgeNodes(
                                      selection.selectionSet.selections,
                                      initialSelectionNodes,
                                  )
                                : initialSelectionNodes;

                            normalSelections.push(selection);
                        }
                    }

                    if (normalSelections.length > 0) {
                        console.log(
                            'needs to resolve some queries normally -> normal flow with updated selection',
                        );
                        requestContext.operation.selectionSet.selections =
                            normalSelections;

                        return null;
                    }

                    if (allPairsQueries.length === 0) {
                        // shoult never reach this - log scenario
                        return null;
                    }

                    console.log('all queries resolved from store');

                    // let derivedQueryName = '';
                    // allPairsQueries.forEach((pairQuery) => {
                    //     const separator = derivedQueryName === '' ? '' : '|';
                    //     const currentName = pairQuery.query.alias
                    //         ? pairQuery.query.alias
                    //         : pairQuery.query.name.value;

                    //     derivedQueryName = `${derivedQueryName}${separator}${currentName}`;
                    // });

                    // const metricsKey = requestContext.operationName
                    //     ? `${requestContext.operationName}-store`
                    //     : `${derivedQueryName}-store`;
                    // const origin =
                    //     requestContext.request.http?.headers.get('origin') ??
                    //     'Unknown';

                    // const profiler = new PerformanceProfiler();
                    // const cpuProfiler = new CpuProfiler();

                    // profiler.start(metricsKey);

                    const results = allPairsQueries.map((pairQuery) =>
                        pairMemoryStore.getQueryResponse(
                            pairQuery.queryName,
                            pairQuery.arguments,
                            pairQuery.requestedFields,
                        ),
                    );

                    // profiler.stop(metricsKey);
                    // const cpuTime = cpuProfiler.stop();

                    // MetricsCollector.setQueryDuration(
                    //     metricsKey,
                    //     origin,
                    //     profiler.duration,
                    // );

                    // MetricsCollector.setQueryCpu(metricsKey, origin, cpuTime);

                    const data = {};
                    for (const [index, result] of results.entries()) {
                        const nameOrAlias =
                            allPairsQueries[index].queryAlias ??
                            allPairsQueries[index].queryName;
                        data[nameOrAlias] = result;
                    }

                    allPairsQueries = [];

                    return {
                        body: {
                            kind: 'single',
                            singleResult: {
                                data: data,
                            },
                        },
                        http: requestContext.response.http,
                    };
                } catch (error) {
                    console.log(error);
                    return null;
                }
            },
            async willSendResponse(requestContext): Promise<void> {
                if (
                    allPairsQueries.length === 0 ||
                    requestContext.response.body.kind !== 'single'
                ) {
                    console.log(
                        'no queries resolved from store -> no response alteration needed',
                    );
                    return;
                }

                requestContext.contextValue.sharedDatass = 'test';

                const responseData =
                    requestContext.response.body.singleResult.data;

                for (const storeQuery of allPairsQueries) {
                    const currentName =
                        storeQuery.queryAlias ?? storeQuery.queryName;

                    if (responseData[currentName] === undefined) {
                        console.log(
                            `query ${currentName} resolved entirely from store`,
                        );
                        const result = pairMemoryStore.getQueryResponse(
                            storeQuery.queryName,
                            storeQuery.arguments,
                            storeQuery.requestedFields,
                        );

                        responseData[currentName] = result;
                        continue;
                    }

                    console.log(
                        `query ${currentName} resolved partially from store`,
                    );

                    responseData[currentName] =
                        pairMemoryStore.appendFieldsToQueryResponse(
                            storeQuery.queryName,
                            responseData[currentName],
                            storeQuery.requestedFields,
                        );
                }
            },
        };
    }
}
