import { UseGuards } from '@nestjs/common';
import { Args, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { ApolloError } from 'apollo-server-express';
import { tokenCollection } from 'src/utils/token.converters';
import { JwtOrNativeAuthGuard } from '../auth/jwt.or.native.auth.guard';
import { LockedAssetAttributesModel } from '../locked-asset-factory/models/locked-asset.model';
import { DecodeAttributesArgs } from './models/proxy.args';
import { WrappedLpTokenAttributesModel } from './models/wrappedLpTokenAttributes.model';
import { ProxyService } from './services/proxy.service';
import { ProxyGetterServiceV1 } from './v1/services/proxy.v1.getter.service';

@Resolver(() => WrappedLpTokenAttributesModel)
export class WrappedLpTokenResolver {
    constructor(
        private readonly proxyService: ProxyService,
        private readonly proxyGetter: ProxyGetterServiceV1,
    ) {}

    @ResolveField()
    async lockedAssetsAttributes(
        @Parent() parent: WrappedLpTokenAttributesModel,
    ): Promise<LockedAssetAttributesModel> {
        try {
            const proxyAddress = await this.proxyService.getProxyAddressByToken(
                tokenCollection(parent.identifier),
            );
            const lockedAssetTokenCollection =
                await this.proxyGetter.getLockedAssetTokenID(proxyAddress);
            return await this.proxyService.getLockedAssetsAttributes(
                proxyAddress,
                lockedAssetTokenCollection[0],
                parent.lockedAssetsNonce,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => [WrappedLpTokenAttributesModel])
    async wrappedLpTokenAttributes(
        @Args('args') args: DecodeAttributesArgs,
    ): Promise<WrappedLpTokenAttributesModel[]> {
        return await this.proxyService.getWrappedLpTokenAttributes(args);
    }
}
