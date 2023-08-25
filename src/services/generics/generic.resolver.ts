import { GraphQLError } from 'graphql';
import { ApolloServerErrorCode } from '@apollo/server/errors';

export class GenericResolver {
    protected async genericFieldResolver<T>(
        fieldResolver: () => Promise<T>,
    ): Promise<T> {
        try {
            return await fieldResolver();
        } catch (error) {
            throw new GraphQLError(error.message, {
                extensions: {
                    code: ApolloServerErrorCode.INTERNAL_SERVER_ERROR,
                },
            });
        }
    }

    protected async genericQuery<T>(
        queryResolver: () => Promise<T>,
    ): Promise<T> {
        try {
            return await queryResolver();
        } catch (error) {
            throw new GraphQLError(error.message, {
                extensions: {
                    code: ApolloServerErrorCode.INTERNAL_SERVER_ERROR,
                },
            });
        }
    }
}
