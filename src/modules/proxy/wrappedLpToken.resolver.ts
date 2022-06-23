import { UseGuards } from '@nestjs/common';
import { Args, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { ApolloError } from 'apollo-server-express';
import { GqlAuthGuard } from '../auth/gql.auth.guard';
import { LockedAssetAttributesModel } from '../locked-asset-factory/models/locked-asset.model';
import { DecodeAttributesArgs } from './models/proxy.args';
import { WrappedLpTokenAttributesModel } from './models/wrappedLpTokenAttributes.model';
import { ProxyGetterService } from './services/proxy.getter.service';
import { ProxyService } from './services/proxy.service';

@Resolver(() => WrappedLpTokenAttributesModel)
export class WrappedLpTokenResolver {
    constructor(
        private readonly proxyService: ProxyService,
        private readonly proxyGetter: ProxyGetterService,
    ) {}

    @ResolveField()
    async lockedAssetsAttributes(
        @Parent() parent: WrappedLpTokenAttributesModel,
    ): Promise<LockedAssetAttributesModel> {
        try {
            const lockedAssetTokenCollection = await this.proxyGetter.getLockedAssetTokenID();
            return await this.proxyService.getLockedAssetsAttributes(
                lockedAssetTokenCollection,
                parent.lockedAssetsNonce,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => [WrappedLpTokenAttributesModel])
    async wrappedLpTokenAttributes(
        @Args('args') args: DecodeAttributesArgs,
    ): Promise<WrappedLpTokenAttributesModel[]> {
        return await this.proxyService.getWrappedLpTokenAttributes(args);
    }
}
