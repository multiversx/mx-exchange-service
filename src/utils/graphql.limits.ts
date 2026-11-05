import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { GraphQLWsSubscriptionsConfig } from '@nestjs/graphql';
import {
    DocumentNode,
    getOperationAST,
    GraphQLError,
    OperationTypeNode,
    parse,
    ParseOptions,
} from 'graphql';

export const graphqlParseOptions: ParseOptions = {
    maxTokens: 1000,
};

// Returns an Apollo driver whose WebSocket server accepts messages of at most
// maxPayload bytes. @nestjs/graphql creates that server with the ws default of
// 100 MiB and has no option for it, so the limit is set once the driver starts,
// before the HTTP server listens. Startup fails if the server isn't found.
export function apolloDriverWithWsMaxPayload(
    maxPayload: number,
): typeof ApolloDriver {
    return class WsLimitedApolloDriver extends ApolloDriver {
        async start(options: ApolloDriverConfig): Promise<void> {
            await super.start(options);

            const server: { options: { maxPayload: number } } | undefined =
                this['_subscriptionService']?.wss;
            if (!server) {
                throw new Error('GraphQL WebSocket server not found');
            }
            server.options.maxPayload = maxPayload;
        }
    };
}

// Bounds the document size and allows only subscriptions over WebSocket.
// Returning nothing lets graphql-ws parse and validate the operation as usual.
export const onWsSubscribe: GraphQLWsSubscriptionsConfig['onSubscribe'] = (
    _ctx,
    _id,
    payload,
) => {
    let document: DocumentNode;
    try {
        document = parse(payload.query, graphqlParseOptions);
    } catch (error) {
        return [
            error instanceof GraphQLError
                ? error
                : new GraphQLError('Invalid GraphQL document'),
        ];
    }

    const operation = getOperationAST(document, payload.operationName);
    if (operation?.operation !== OperationTypeNode.SUBSCRIPTION) {
        return [
            new GraphQLError(
                'Only subscription operations are allowed over WebSocket',
            ),
        ];
    }
};
