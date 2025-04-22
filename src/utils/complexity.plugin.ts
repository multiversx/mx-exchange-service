import { Plugin } from '@nestjs/apollo';
import {
    ApolloServerPlugin,
    BaseContext,
    GraphQLRequestListener,
    GraphQLServerContext,
} from '@apollo/server';
import {
    fieldExtensionsEstimator,
    getComplexity,
    simpleEstimator,
} from 'graphql-query-complexity';
import { GraphQLSchema } from 'graphql';
import { complexityConfig } from 'src/config';
import { GraphQLError } from 'graphql';
import { ApolloServerErrorCode } from '@apollo/server/errors';
import { rootQueryEstimator } from 'src/helpers/complexity/query.estimators';

@Plugin()
export class ComplexityPlugin implements ApolloServerPlugin {
    private schema: GraphQLSchema;

    async serverWillStart(service: GraphQLServerContext) {
        this.schema = service.schema;
    }

    async requestDidStart(): Promise<GraphQLRequestListener<BaseContext>> {
        const {
            maxComplexity,
            exposeComplexity,
            rejectQueries,
            collectMetrics,
        } = complexityConfig;
        const schema = this.schema;

        return {
            async didResolveOperation({
                request,
                document,
                response,
                contextValue,
            }) {
                const complexity = getComplexity({
                    schema,
                    operationName: request.operationName,
                    query: document,
                    variables: request.variables,
                    estimators: [
                        rootQueryEstimator(),
                        fieldExtensionsEstimator(),
                        simpleEstimator({
                            defaultComplexity:
                                complexityConfig.defaultComplexity,
                        }),
                    ],
                    context: { queryCount: 0 },
                });

                if (exposeComplexity) {
                    response.http.headers.set(
                        'X-Operation-Complexity',
                        complexity.toFixed(),
                    );
                }

                if (collectMetrics) {
                    // query metrics plugin will handle collection
                    contextValue['complexity'] = complexity;
                }

                if (rejectQueries && complexity > maxComplexity) {
                    throw new GraphQLError(
                        `Query is too complex: ${complexity}. Maximum allowed complexity: ${maxComplexity}`,
                        {
                            extensions: {
                                code: ApolloServerErrorCode.BAD_USER_INPUT,
                            },
                        },
                    );
                }
            },
        };
    }
}
