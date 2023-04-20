import { UseGuards } from '@nestjs/common';
import { Args, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { ApolloError } from 'apollo-server-express';
import { MXApiService } from 'src/services/multiversx-communication/mx.api.service';
import { tokenCollection, tokenIdentifier } from 'src/utils/token.converters';
import { JwtOrNativeAuthGuard } from '../auth/jwt.or.native.auth.guard';
import { FarmTokenAttributesUnion } from '../farm/models/farmTokenAttributes.model';
import { LockedAssetAttributesModel } from '../locked-asset-factory/models/locked-asset.model';
import { DecodeAttributesArgs } from './models/proxy.args';
import { WrappedFarmTokenAttributesModel } from './models/wrappedFarmTokenAttributes.model';
import { WrappedLpTokenAttributesModel } from './models/wrappedLpTokenAttributes.model';
import { ProxyService } from './services/proxy.service';
import { ProxyAbiService } from './services/proxy.abi.service';
import { ProxyPairAbiService } from './services/proxy-pair/proxy.pair.abi.service';

@Resolver(() => WrappedFarmTokenAttributesModel)
export class WrappedFarmTokenResolver {
    constructor(
        private readonly proxyService: ProxyService,
        private readonly proxyAbi: ProxyAbiService,
        private readonly proxyPairAbi: ProxyPairAbiService,
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
                await this.proxyAbi.lockedAssetTokenID(proxyAddress);
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
                await this.proxyPairAbi.wrappedLpTokenID(proxyAddress);
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
            return this.proxyService.decodeWrappedLpTokenAttributes({
                attributes: wrappedLpToken.attributes,
                identifier: wrappedLpToken.identifier,
            });
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => [WrappedFarmTokenAttributesModel])
    async wrappedFarmTokenAttributes(
        @Args('args')
        args: DecodeAttributesArgs,
    ): Promise<WrappedFarmTokenAttributesModel[]> {
        return this.proxyService.getWrappedFarmTokenAttributes(args);
    }
}
