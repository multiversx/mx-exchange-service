import { Args, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { ApolloError } from 'apollo-server-express';
import { GenericResolver } from 'src/services/generics/generic.resolver';
import { AssetsModel } from './models/assets.model';
import { NftToken } from './models/nftToken.model';

@Resolver(NftToken)
export class NftTokenResolver extends GenericResolver {
    @ResolveField(() => AssetsModel, { nullable: true })
    async assets(@Parent() parent: NftToken): Promise<AssetsModel> {
        return new AssetsModel(parent.assets);
    }

    @Query(() => NftToken)
    async nftToken(@Args('identifier') identifier: string): Promise<NftToken> {
        throw new ApolloError('Query not implemented');
    }
}
