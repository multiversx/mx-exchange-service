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
    parseFilteredQueryFields,
    updateFilteredQueryEdgeNodes,
} from './utils/graphql.utils';
import { QueryField } from './entities/query.field.type';
import { CpuProfiler } from '@multiversx/sdk-nestjs-monitoring';
import { PerformanceProfiler } from 'src/utils/performance.profiler';
import { MetricsCollector } from 'src/utils/metrics.collector';

@Plugin()
export class MemoryStoreApolloPlugin implements ApolloServerPlugin {
    constructor(private readonly pairMemoryStore: PairMemoryStoreService) {}

    async requestDidStart(): Promise<GraphQLRequestListener<any>> {
        const pairMemoryStore = this.pairMemoryStore;
        const allPairsQueries: {
            // query: FieldNode;
            queryName: string;
            queryAlias: string;
            isFiltered: boolean;
            requestedFields: QueryField[];
            arguments: Record<string, any>;
        }[] = [];

        return {
            async responseForOperation(
                requestContext,
            ): Promise<GraphQLResponse | null> {
                try {
                    // if (!pairMemoryStore.isReady()) {
                    //     return null;
                    // }

                    const targetedQueries = Object.keys(
                        PairMemoryStoreService.targetedQueries,
                    );

                    // console.log(requestContext.operation.variableDefinitions);

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

                        const { missingFields, isFiltered } =
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
                            });
                        }

                        if (initialSelectionNodes.length > 0) {
                            // if filtered - update the edges.node field of the original set
                            // otherwise update original selection set

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
                        // shoult never reach this
                        return null;
                    }

                    return null;

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

                    // for (const pairQuery of allPairsQueries) {
                    //     pairQuery.arguments = parseArguments(
                    //         pairQuery.query.arguments,
                    //         requestContext.request.variables,
                    //     );
                    // }

                    const results = allPairsQueries.map((pairQuery) =>
                        pairMemoryStore.getSortedAndFilteredData(
                            pairQuery.requestedFields,
                            pairQuery.arguments,
                            pairQuery.isFiltered,
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
                    // for (const [index, result] of results.entries()) {
                    //     const nameOrAlias = allPairsQueries[index].query.alias
                    //         ? allPairsQueries[index].query.alias.value
                    //         : allPairsQueries[index].query.name.value;
                    //     data[nameOrAlias] = result;
                    // }

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
                const responseData =
                    requestContext.response.body.singleResult.data;

                const results = allPairsQueries.map((pairQuery) =>
                    pairMemoryStore.getSortedAndFilteredData(
                        pairQuery.requestedFields,
                        pairQuery.arguments,
                        pairQuery.isFiltered,
                    ),
                );

                // console.log(responseData);

                for (const [index, storeQuery] of allPairsQueries.entries()) {
                    const currentName =
                        storeQuery.queryAlias ?? storeQuery.queryName;

                    if (responseData[currentName]) {
                        console.log(
                            `query ${currentName} resolved partially from store`,
                        );
                        if (Array.isArray(responseData[currentName])) {
                            console.log('update array from store');
                            const updatedResponse = (
                                responseData[currentName] as Array<
                                    Record<string, any>
                                >
                            ).map((elem, elemIndex) => {
                                return {
                                    ...elem,
                                    ...results[index][elemIndex],
                                };
                            });

                            responseData[currentName] = updatedResponse;
                        } else {
                            console.log(
                                'update object from store',
                                results[index],
                            );
                            responseData[currentName] = {
                                ...(responseData[currentName] as Record<
                                    string,
                                    any
                                >),
                                ...results[index],
                            };
                        }
                    } else {
                        console.log(
                            `query ${currentName} resolved entirely from store`,
                        );
                        responseData[currentName] = results[index];
                    }
                }
            },
        };
    }
}
