import { Args, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { ApolloError } from 'apollo-server-express';
import { tokenCollection } from 'src/utils/token.converters';
import { LockedAssetGetterService } from '../locked-asset-factory/services/locked.asset.getter.service';
import { LockedAssetAttributesUnion } from './models/locked.assets.attributes.union';
import { DecodeAttributesArgs } from './models/proxy.args';
import { WrappedLpTokenAttributesModelV2 } from './models/wrappedLpTokenAttributes.model';
import { ProxyService } from './services/proxy.service';

@Resolver(() => WrappedLpTokenAttributesModelV2)
export class WrappedLpTokenAttributesResolverV2 {
    constructor(
        private readonly proxyService: ProxyService,
        private readonly lockedAssetsGetter: LockedAssetGetterService,
    ) {}

    @ResolveField()
    async lockedAssetsAttributes(
        @Parent() parent: WrappedLpTokenAttributesModelV2,
    ): Promise<typeof LockedAssetAttributesUnion> {
        try {
            const [proxyAddress, oldLockedAssetID] = await Promise.all([
                this.proxyService.getProxyAddressByToken(
                    tokenCollection(parent.identifier),
                ),
                this.lockedAssetsGetter.getLockedTokenID(),
            ]);

            if (parent.lockedTokens.tokenIdentifier === oldLockedAssetID) {
                return await this.proxyService.getLockedAssetsAttributes(
                    proxyAddress,
                    parent.lockedTokens.tokenIdentifier,
                    parent.lockedTokens.tokenNonce,
                );
            }
            return await this.proxyService.getLockedTokenAttributes(
                proxyAddress,
                parent.lockedTokens.tokenIdentifier,
                parent.lockedTokens.tokenNonce,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @Query(() => [WrappedLpTokenAttributesModelV2])
    async wrappedLpTokenAttributesV2(
        @Args('args') args: DecodeAttributesArgs,
    ): Promise<WrappedLpTokenAttributesModelV2[]> {
        return await this.proxyService.getWrappedLpTokenAttributesV2(args);
    }
}