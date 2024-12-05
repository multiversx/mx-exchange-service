import {
    ApolloServerPlugin,
    GraphQLRequestListener,
    GraphQLResponse,
} from '@apollo/server';
import { Plugin } from '@nestjs/apollo';
import { FieldNode, Kind, SelectionNode } from 'graphql';
import {
    extractFilteredQueryEdgeNodes,
    extractQueryFields,
    parseArguments,
    updateFilteredQueryEdgeNodes,
} from './utils/graphql.utils';
import { QueryField } from './entities/query.field.type';
import { MemoryStoreFactoryService } from './services/memory.store.factory.service';

@Plugin()
export class MemoryStoreApolloPlugin implements ApolloServerPlugin {
    constructor(
        private readonly memoryStoreFactory: MemoryStoreFactoryService,
    ) {}

    async requestDidStart(): Promise<GraphQLRequestListener<any>> {
        const memoryStoreFactory = this.memoryStoreFactory;

        const storeResolvableQueries: Array<{
            queryName: string;
            queryAlias?: string;
            isFiltered: boolean;
            requestedFields: QueryField[];
            arguments: Record<string, any>;
        }> = [];

        return {
            async responseForOperation(
                requestContext,
            ): Promise<GraphQLResponse | null> {
                if (!memoryStoreFactory.isReady()) {
                    return null;
                }

                const targetedQueryNames =
                    memoryStoreFactory.getTargetedQueryNames();

                const requestSelections =
                    requestContext.operation.selectionSet.selections;

                // Separate selections into those that can be resolved from the store and those that need normal resolution
                const normalSelections: SelectionNode[] = [];
                for (const selection of requestSelections) {
                    if (selection.kind !== Kind.FIELD) {
                        normalSelections.push(selection);
                        continue;
                    }

                    const queryName = selection.name.value;
                    if (!targetedQueryNames.includes(queryName)) {
                        normalSelections.push(selection);
                        continue;
                    }

                    const targetedQueries = memoryStoreFactory
                        .useService(queryName)
                        .getTargetedQueries();

                    const { missingFields, isFiltered, identifierField } =
                        targetedQueries[queryName];

                    const actualNodes = isFiltered
                        ? extractFilteredQueryEdgeNodes(
                              selection.selectionSet?.selections,
                          )
                        : selection.selectionSet?.selections || [];

                    const { storeNodes, normalNodes, identifierNode } =
                        partitionSelectionNodes(
                            actualNodes,
                            missingFields,
                            identifierField,
                        );

                    if (storeNodes.length > 0) {
                        storeResolvableQueries.push({
                            queryName,
                            queryAlias: selection.alias?.value,
                            requestedFields: extractQueryFields(storeNodes),
                            arguments: parseArguments(
                                selection.arguments,
                                requestContext.request.variables,
                            ),
                            isFiltered,
                        });
                    }

                    if (normalNodes.length > 0) {
                        if (!identifierNode) {
                            // Cannot map store data without the identifier field
                            storeResolvableQueries.length = 0;
                            return null;
                        }

                        // Ensure identifier node is included
                        normalNodes.push(identifierNode);

                        // Update the selection set accordingly
                        selection.selectionSet.selections = isFiltered
                            ? updateFilteredQueryEdgeNodes(
                                  selection.selectionSet.selections,
                                  normalNodes,
                              )
                            : normalNodes;

                        normalSelections.push(selection);
                    }
                }

                // If there are normal selections, proceed with the normal request flow
                if (normalSelections.length > 0) {
                    requestContext.operation.selectionSet.selections =
                        normalSelections;
                    requestContext.contextValue.storeResolve =
                        storeResolvableQueries.length > 0
                            ? 'partial'
                            : undefined;

                    return null;
                }

                // If no queries can be resolved from the store, proceed normally
                if (storeResolvableQueries.length === 0) {
                    return null;
                }

                // Fully resolve from store
                const data = resolveQueriesFromStore(
                    storeResolvableQueries,
                    memoryStoreFactory,
                );

                // Clear the processed queries since we're returning the response here
                storeResolvableQueries.length = 0;

                requestContext.contextValue.storeResolve = 'full';

                return {
                    body: {
                        kind: 'single',
                        singleResult: {
                            data: data,
                        },
                    },
                    http: requestContext.response.http,
                };
            },
            async willSendResponse(requestContext): Promise<void> {
                if (
                    storeResolvableQueries.length === 0 ||
                    requestContext.response.body.kind !== 'single'
                ) {
                    return;
                }

                const responseData =
                    requestContext.response.body.singleResult.data;

                for (const storeQuery of storeResolvableQueries) {
                    const queryKey =
                        storeQuery.queryAlias || storeQuery.queryName;

                    if (!responseData[queryKey]) {
                        // Query was not resolved; resolve entirely from store
                        responseData[queryKey] = memoryStoreFactory
                            .useService(storeQuery.queryName)
                            .getQueryResponse(
                                storeQuery.queryName,
                                storeQuery.arguments,
                                storeQuery.requestedFields,
                            );

                        continue;
                    } else {
                        // Append fields from the store to the partially resolved response
                        responseData[queryKey] = memoryStoreFactory
                            .useService(storeQuery.queryName)
                            .appendFieldsToQueryResponse(
                                storeQuery.queryName,
                                responseData[queryKey],
                                storeQuery.requestedFields,
                            );
                    }
                }
            },
        };
    }
}

/**
 * Partitions selection nodes into store-resolvable nodes, normal nodes, and identifies the identifier node.
 */
function partitionSelectionNodes(
    nodes: ReadonlyArray<SelectionNode>,
    missingFields: QueryField[],
    identifierField: string,
) {
    const storeNodes: SelectionNode[] = [];
    const normalNodes: SelectionNode[] = [];
    let identifierNode: FieldNode | undefined;

    for (const node of nodes) {
        if (node.kind !== Kind.FIELD) {
            normalNodes.push(node);
            continue;
        }

        const isMissingField = missingFields.some(
            (field) => field.name === node.name.value,
        );

        if (isMissingField) {
            normalNodes.push(node);
        } else if (node.name.value === identifierField) {
            identifierNode = node;
        } else {
            storeNodes.push(node);
        }
    }

    return { storeNodes, normalNodes, identifierNode };
}

/**
 * Resolves a list of queries entirely from the memory store.
 */
function resolveQueriesFromStore(
    queries: Array<{
        queryName: string;
        queryAlias?: string;
        requestedFields: QueryField[];
        arguments: Record<string, any>;
    }>,
    memoryStoreFactory: MemoryStoreFactoryService,
) {
    const data: Record<string, any> = {};

    for (const query of queries) {
        const result = memoryStoreFactory
            .useService(query.queryName)
            .getQueryResponse(
                query.queryName,
                query.arguments,
                query.requestedFields,
            );
        const key = query.queryAlias || query.queryName;
        data[key] = result;
    }

    return data;
}
