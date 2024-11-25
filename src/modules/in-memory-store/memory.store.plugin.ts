import {
    ApolloServerPlugin,
    GraphQLRequestListener,
    GraphQLResponse,
} from '@apollo/server';
import { Plugin } from '@nestjs/apollo';
import { FieldNode, Kind } from 'graphql';
import { PairInMemoryStoreService } from '../pair/services/pair.in.memory.store.service';
import { extractQueryFields, parseArguments } from './utils/graphql.utils';

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
                                    return true;
                                }
                                console.log('here');
                                return false;
                            },
                        );

                    if (!queryCanBeResolvedFromStore) {
                        console.log('resolve normally');

                        return null;
                    }

                    const requestedFields = extractQueryFields(
                        pairsQuery.selectionSet?.selections || [],
                    );
                    const parsedArguments = parseArguments(
                        pairsQuery.arguments,
                        requestContext.request.variables,
                    );

                    const result = pairMemoryStore.getSortedAndFilteredData(
                        requestedFields,
                        parsedArguments,
                        isFilteredQuery,
                    );

                    return {
                        body: {
                            kind: 'single',
                            singleResult: {
                                data: {
                                    pairs: result,
                                },
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
