import { UseGuards } from '@nestjs/common';
import { Args, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { ApolloError } from 'apollo-server-express';
import { scAddress } from 'src/config';
import { ElrondApiService } from 'src/services/elrond-communication/elrond-api.service';
import { tokenIdentifier } from 'src/utils/token.converters';
import { GqlAuthGuard } from '../auth/gql.auth.guard';
import { FarmTokenAttributesUnion } from '../farm/models/farmTokenAttributes.model';
import { LockedAssetAttributesModel } from '../locked-asset-factory/models/locked-asset.model';
import { DecodeAttributesArgs } from './models/proxy.args';
import { WrappedFarmTokenAttributesModel } from './models/wrappedFarmTokenAttributes.model';
import { WrappedLpTokenAttributesModel } from './models/wrappedLpTokenAttributes.model';
import { ProxyPairGetterService } from './services/proxy-pair/proxy-pair.getter.service';
import { ProxyGetterService } from './services/proxy.getter.service';
import { ProxyService } from './services/proxy.service';

@Resolver(() => WrappedFarmTokenAttributesModel)
export class WrappedFarmTokenResolver {
    constructor(
        private readonly proxyService: ProxyService,
        private readonly proxyGetter: ProxyGetterService,
        private readonly proxyPairGetter: ProxyPairGetterService,
        private readonly apiService: ElrondApiService,
    ) {}

    @ResolveField()
    async farmTokenAttributes(
        @Parent() parent: WrappedFarmTokenAttributesModel,
    ): Promise<typeof FarmTokenAttributesUnion> {
        try {
            return await this.proxyService.getFarmTokenAttributes(
                parent.farmTokenID,
                parent.farmTokenNonce,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async lockedAssetsAttributes(
        @Parent() parent: WrappedFarmTokenAttributesModel,
    ): Promise<LockedAssetAttributesModel> {
        try {
            const proxyAddress = await this.proxyService.getProxyAddressByToken(
                parent.identifier,
            );
            const lockedAssetTokenCollection =
                await this.proxyGetter.getLockedAssetTokenID(proxyAddress);
            if (lockedAssetTokenCollection != parent.farmingTokenID) {
                return null;
            }
            return await this.proxyService.getLockedAssetsAttributes(
                lockedAssetTokenCollection,
                parent.farmingTokenNonce,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async lockedLpProxyTokenAttributes(
        @Parent() parent: WrappedFarmTokenAttributesModel,
    ): Promise<WrappedLpTokenAttributesModel> {
        try {
            const proxyAddress = await this.proxyService.getProxyAddressByToken(
                parent.identifier,
            );
            const wrappedLpTokenCollection =
                await this.proxyPairGetter.getwrappedLpTokenID(proxyAddress);
            if (wrappedLpTokenCollection != parent.farmingTokenID) {
                return null;
            }
            const wrappedLpToken =
                await this.apiService.getNftByTokenIdentifier(
                    scAddress.proxyDexAddress,
                    tokenIdentifier(
                        parent.farmingTokenID,
                        parent.farmingTokenNonce,
                    ),
                );
            return await this.proxyService.decodeWrappedLpTokenAttributes({
                attributes: wrappedLpToken.attributes,
                identifier: wrappedLpToken.identifier,
            });
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => [WrappedFarmTokenAttributesModel])
    async wrappedFarmTokenAttributes(
        @Args('args')
        args: DecodeAttributesArgs,
    ): Promise<WrappedFarmTokenAttributesModel[]> {
        return await this.proxyService.getWrappedFarmTokenAttributes(args);
    }
}
