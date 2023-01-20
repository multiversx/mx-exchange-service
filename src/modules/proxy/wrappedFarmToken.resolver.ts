import { UseGuards } from '@nestjs/common';
import { Args, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { ApolloError } from 'apollo-server-express';
import { MXApiService } from 'src/services/multiversx-communication/mx.api.service';
import { tokenCollection, tokenIdentifier } from 'src/utils/token.converters';
import { GqlAuthGuard } from '../auth/gql.auth.guard';
import { FarmTokenAttributesUnion } from '../farm/models/farmTokenAttributes.model';
import { LockedAssetAttributesModel } from '../locked-asset-factory/models/locked-asset.model';
import { DecodeAttributesArgs } from './models/proxy.args';
import { WrappedFarmTokenAttributesModel } from './models/wrappedFarmTokenAttributes.model';
import { WrappedLpTokenAttributesModel } from './models/wrappedLpTokenAttributes.model';
import { ProxyPairGetterService } from './services/proxy-pair/proxy-pair.getter.service';
import { ProxyService } from './services/proxy.service';
import { ProxyGetterServiceV1 } from './v1/services/proxy.v1.getter.service';

@Resolver(() => WrappedFarmTokenAttributesModel)
export class WrappedFarmTokenResolver {
    constructor(
        private readonly proxyService: ProxyService,
        private readonly proxyGetter: ProxyGetterServiceV1,
        private readonly proxyPairGetter: ProxyPairGetterService,
        private readonly apiService: MXApiService,
    ) {}

    @ResolveField()
    async farmTokenAttributes(
        @Parent() parent: WrappedFarmTokenAttributesModel,
    ): Promise<typeof FarmTokenAttributesUnion> {
        try {
            const proxyAddress = await this.proxyService.getProxyAddressByToken(
                tokenCollection(parent.identifier),
            );
            return await this.proxyService.getFarmTokenAttributes(
                proxyAddress,
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
                tokenCollection(parent.identifier),
            );
            const lockedAssetTokenCollection =
                await this.proxyGetter.getLockedAssetTokenID(proxyAddress);
            if (!lockedAssetTokenCollection.includes(parent.farmingTokenID)) {
                return null;
            }
            return await this.proxyService.getLockedAssetsAttributes(
                proxyAddress,
                parent.farmingTokenID,
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
                tokenCollection(parent.identifier),
            );
            const wrappedLpTokenCollection =
                await this.proxyPairGetter.getwrappedLpTokenID(proxyAddress);
            if (wrappedLpTokenCollection != parent.farmingTokenID) {
                return null;
            }
            const wrappedLpToken =
                await this.apiService.getNftByTokenIdentifier(
                    proxyAddress,
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
