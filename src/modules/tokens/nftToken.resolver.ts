import { Args, Query, Resolver } from '@nestjs/graphql';
import { NftToken } from './models/nftToken.model';
import { GraphQLError } from 'graphql';
import { ApolloServerErrorCode } from '@apollo/server/errors';

@Resolver(NftToken)
export class NftTokenResolver {
    @Query(() => NftToken)
    async nftToken(@Args('identifier') identifier: string): Promise<NftToken> {
        throw new GraphQLError('Query not implemented', {
            extensions: {
                code: ApolloServerErrorCode.INTERNAL_SERVER_ERROR,
            },
        });
    }
}
