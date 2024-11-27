import {
    ApolloServerPlugin,
    GraphQLRequestListener,
    GraphQLResponse,
} from '@apollo/server';
import { Plugin } from '@nestjs/apollo';
import { FieldNode, Kind } from 'graphql';
import { PairInMemoryStoreService } from '../pair/services/pair.in.memory.store.service';
import {
    extractQueryFields,
    parseArguments,
    parseFilteredQueryFields,
} from './utils/graphql.utils';
import { QueryField } from './entities/query.field.type';
import { CpuProfiler } from '@multiversx/sdk-nestjs-monitoring';
import { PerformanceProfiler } from 'src/utils/performance.profiler';
import { MetricsCollector } from 'src/utils/metrics.collector';

@Plugin()
export class MemoryStoreApolloPlugin implements ApolloServerPlugin {
    constructor(private readonly pairMemoryStore: PairInMemoryStoreService) {}

    async requestDidStart(): Promise<GraphQLRequestListener<any>> {
        const pairMemoryStore = this.pairMemoryStore;

        return {
            async responseForOperation(
                requestContext,
            ): Promise<GraphQLResponse | null> {
                const allPairsQueries: {
                    query: FieldNode;
                    isFiltered: boolean;
                    requestedFields: QueryField[];
                    arguments: Record<string, any>;
                }[] = [];

                try {
                    if (!pairMemoryStore.isReady()) {
                        return null;
                    }

                    const queryCanBeResolvedFromStore =
                        requestContext.operation.selectionSet.selections.every(
                            (selection) => {
                                if (
                                    selection.kind === Kind.FIELD &&
                                    (selection.name.value === 'pairs' ||
                                        selection.name.value ===
                                            'filteredPairs')
                                ) {
                                    const isFilteredQuery =
                                        selection.name.value ===
                                        'filteredPairs';

                                    const missingFields =
                                        PairInMemoryStoreService.missingFields()[
                                            selection.name.value
                                        ];

                                    const requestedFields = isFilteredQuery
                                        ? parseFilteredQueryFields(
                                              extractQueryFields(
                                                  selection.selectionSet
                                                      ?.selections || [],
                                              ),
                                          )
                                        : extractQueryFields(
                                              selection.selectionSet
                                                  ?.selections || [],
                                          );

                                    allPairsQueries.push({
                                        query: selection,
                                        isFiltered: isFilteredQuery,
                                        requestedFields: requestedFields,
                                        arguments: {},
                                    });

                                    if (!missingFields) {
                                        return true;
                                    }

                                    for (const field of requestedFields) {
                                        const requestedMissingField =
                                            missingFields.find(
                                                (missingField) =>
                                                    missingField.name ===
                                                    field.name,
                                            );

                                        if (requestedMissingField) {
                                            return false;
                                        }
                                    }
                                    return true;
                                }
                                return false;
                            },
                        );

                    if (!queryCanBeResolvedFromStore) {
                        return null;
                    }

                    let derivedQueryName = '';
                    allPairsQueries.forEach((pairQuery) => {
                        const separator = derivedQueryName === '' ? '' : '|';
                        const currentName = pairQuery.query.alias
                            ? pairQuery.query.alias
                            : pairQuery.query.name.value;

                        derivedQueryName = `${derivedQueryName}${separator}${currentName}`;
                    });

                    const metricsKey = requestContext.operationName
                        ? `${requestContext.operationName}-store`
                        : `${derivedQueryName}-store`;
                    const origin =
                        requestContext.request.http?.headers.get('origin') ??
                        'Unknown';

                    const profiler = new PerformanceProfiler();
                    const cpuProfiler = new CpuProfiler();

                    profiler.start(metricsKey);

                    for (const pairQuery of allPairsQueries) {
                        pairQuery.arguments = parseArguments(
                            pairQuery.query.arguments,
                            requestContext.request.variables,
                        );
                    }

                    const results = allPairsQueries.map((pairQuery) =>
                        pairMemoryStore.getSortedAndFilteredData(
                            pairQuery.requestedFields,
                            pairQuery.arguments,
                            pairQuery.isFiltered,
                        ),
                    );

                    profiler.stop(metricsKey);
                    const cpuTime = cpuProfiler.stop();

                    MetricsCollector.setQueryDuration(
                        metricsKey,
                        origin,
                        profiler.duration,
                    );

                    MetricsCollector.setQueryCpu(metricsKey, origin, cpuTime);

                    const data = {};
                    for (const [index, result] of results.entries()) {
                        const nameOrAlias = allPairsQueries[index].query.alias
                            ? allPairsQueries[index].query.alias.value
                            : allPairsQueries[index].query.name.value;
                        data[nameOrAlias] = result;
                    }

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
        };
    }
}
