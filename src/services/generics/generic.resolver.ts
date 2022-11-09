import { ApolloError } from 'apollo-server-express';

export class GenericResolver {
    protected async genericFieldResolver<T>(
        fieldResolver: () => Promise<T>,
    ): Promise<T> {
        try {
            return await fieldResolver();
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    protected async genericQuery<T>(
        queryResolver: () => Promise<T>,
    ): Promise<T> {
        try {
            return await queryResolver();
        } catch (error) {
            throw new ApolloError(error);
        }
    }
}
