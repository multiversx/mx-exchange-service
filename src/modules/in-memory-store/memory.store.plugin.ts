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

@Plugin()
export class MemoryStoreApolloPlugin implements ApolloServerPlugin {
    constructor(private readonly pairMemoryStore: PairInMemoryStoreService) {}

    async requestDidStart(): Promise<GraphQLRequestListener<any>> {
        const pairMemoryStore = this.pairMemoryStore;

        return {
            async responseForOperation(
                requestContext,
            ): Promise<GraphQLResponse | null> {
                let pairsQuery: FieldNode;
                let isFilteredQuery = false;
                try {
                    if (!pairMemoryStore.isReady()) {
                        return null;
                    }
                    let requestedFields: QueryField[];

                    const queryCanBeResolvedFromStore =
                        requestContext.operation.selectionSet.selections.every(
                            (selection) => {
                                if (
                                    selection.kind === Kind.FIELD &&
                                    (selection.name.value === 'pairs' ||
                                        selection.name.value ===
                                            'filteredPairs')
                                ) {
                                    isFilteredQuery =
                                        selection.name.value ===
                                        'filteredPairs';
                                    pairsQuery = selection;

                                    const missingFields =
                                        PairInMemoryStoreService.missingFields()[
                                            selection.name.value
                                        ];

                                    if (!missingFields) {
                                        return true;
                                    }

                                    requestedFields = isFilteredQuery
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

                    const parsedArguments = parseArguments(
                        pairsQuery.arguments,
                        requestContext.request.variables,
                    );

                    const result = pairMemoryStore.getSortedAndFilteredData(
                        requestedFields,
                        parsedArguments,
                        isFilteredQuery,
                    );

                    const nameOrAlias = pairsQuery.alias
                        ? pairsQuery.alias.value
                        : pairsQuery.name.value;
                    const data = {};

                    data[nameOrAlias] = result;

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
