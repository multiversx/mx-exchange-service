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
