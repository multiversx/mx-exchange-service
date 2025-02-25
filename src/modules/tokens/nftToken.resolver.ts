import { Args, Query, Resolver } from '@nestjs/graphql';
import { GenericResolver } from 'src/services/generics/generic.resolver';
import { NftToken } from './models/nftToken.model';
import { GraphQLError } from 'graphql';
import { ApolloServerErrorCode } from '@apollo/server/errors';

@Resolver(NftToken)
export class NftTokenResolver extends GenericResolver {
    @Query(() => NftToken)
    async nftToken(@Args('identifier') identifier: string): Promise<NftToken> {
        throw new GraphQLError('Query not implemented', {
            extensions: {
                code: ApolloServerErrorCode.INTERNAL_SERVER_ERROR,
            },
        });
    }
}
