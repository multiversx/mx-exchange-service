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

@Plugin()
export class MemoryStoreApolloPlugin implements ApolloServerPlugin {
    constructor(private readonly pairMemoryStore: PairMemoryStoreService) {}

    async requestDidStart(): Promise<GraphQLRequestListener<any>> {
        const pairMemoryStore = this.pairMemoryStore;
        let allPairsQueries: {
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
                    if (!pairMemoryStore.isReady()) {
                        return null;
                    }

                    const targetedQueries =
                        pairMemoryStore.getTargetedQueries();

                    const targetedQueryNames = Object.keys(targetedQueries);

                    const requestQueries =
                        requestContext.operation.selectionSet.selections;

                    const normalSelections: SelectionNode[] = [];
                    for (const selection of requestQueries) {
                        if (
                            selection.kind !== Kind.FIELD ||
                            !targetedQueryNames.includes(selection.name.value)
                        ) {
                            normalSelections.push(selection);
                            continue;
                        }

                        const { missingFields, isFiltered, identifierField } =
                            targetedQueries[selection.name.value];

                        const actualNodes = isFiltered
                            ? extractFilteredQueryEdgeNodes(
                                  selection.selectionSet?.selections,
                              )
                            : selection.selectionSet?.selections;

                        const regularSelectionNodes: SelectionNode[] = [];
                        const storeSelectionNodes: SelectionNode[] = [];
                        let identifierNode: FieldNode;
                        for (const node of actualNodes) {
                            if (node.kind !== Kind.FIELD) {
                                regularSelectionNodes.push(node);
                                continue;
                            }

                            const requestedMissingField = missingFields.find(
                                (missingField) =>
                                    missingField.name === node.name.value,
                            );

                            if (requestedMissingField) {
                                regularSelectionNodes.push(node);
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
                            });
                        }

                        if (regularSelectionNodes.length > 0) {
                            if (identifierNode === undefined) {
                                // identifier node was never requested - cannot map store data to regular response
                                allPairsQueries = [];
                                return null;
                            }

                            // add identifier node to regular nodes to allow appending fields from store
                            regularSelectionNodes.push(identifierNode);

                            // if filtered - update the edges.node field of the original set
                            // otherwise completely overwrite the original set
                            selection.selectionSet.selections = isFiltered
                                ? updateFilteredQueryEdgeNodes(
                                      selection.selectionSet.selections,
                                      regularSelectionNodes,
                                  )
                                : regularSelectionNodes;

                            normalSelections.push(selection);
                        }
                    }

                    // resolve part of the queries normally
                    if (normalSelections.length > 0) {
                        requestContext.operation.selectionSet.selections =
                            normalSelections;

                        requestContext.contextValue.storeResolve = 'store_P';

                        return null;
                    }

                    // shoult never reach this - log just in case
                    if (allPairsQueries.length === 0) {
                        return null;
                    }

                    // resolve fully from store
                    const results = allPairsQueries.map((pairQuery) =>
                        pairMemoryStore.getQueryResponse(
                            pairQuery.queryName,
                            pairQuery.arguments,
                            pairQuery.requestedFields,
                        ),
                    );

                    const data = {};
                    for (const [index, result] of results.entries()) {
                        const nameOrAlias =
                            allPairsQueries[index].queryAlias ??
                            allPairsQueries[index].queryName;
                        data[nameOrAlias] = result;
                    }

                    // empty processed queries since result is returned here
                    allPairsQueries = [];

                    requestContext.contextValue.storeResolve = 'store_F';

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
                    // no response alteration needed
                    return;
                }

                const responseData =
                    requestContext.response.body.singleResult.data;

                for (const storeQuery of allPairsQueries) {
                    const currentName =
                        storeQuery.queryAlias ?? storeQuery.queryName;

                    if (responseData[currentName] === undefined) {
                        console.log(
                            `query ${currentName} resolved entirely from store`,
                        );
                        responseData[currentName] =
                            pairMemoryStore.getQueryResponse(
                                storeQuery.queryName,
                                storeQuery.arguments,
                                storeQuery.requestedFields,
                            );

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
