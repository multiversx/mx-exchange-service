import { Args, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { ApolloError } from 'apollo-server-express';
import { ElrondApiService } from 'src/services/elrond-communication/elrond-api.service';
import { tokenCollection, tokenIdentifier } from 'src/utils/token.converters';
import { FarmTokenAttributesUnion } from '../farm/models/farmTokenAttributes.model';
import { LockedAssetGetterService } from '../locked-asset-factory/services/locked.asset.getter.service';
import { LockedAssetAttributesUnion } from './models/locked.assets.attributes.union';
import { DecodeAttributesArgs } from './models/proxy.args';
import { WrappedFarmTokenAttributesModelV2 } from './models/wrappedFarmTokenAttributes.model';
import { WrappedLpTokenAttributesModelV2 } from './models/wrappedLpTokenAttributes.model';
import { ProxyPairGetterService } from './services/proxy-pair/proxy-pair.getter.service';
import { ProxyService } from './services/proxy.service';

@Resolver(() => WrappedFarmTokenAttributesModelV2)
export class WrappedFarmTokenResolverV2 {
    constructor(
        private readonly proxyService: ProxyService,
        private readonly proxyPairGetter: ProxyPairGetterService,
        private readonly lockedAssetGetter: LockedAssetGetterService,
        private readonly apiService: ElrondApiService,
    ) {}

    @ResolveField()
    async farmTokenAttributes(
        @Parent() parent: WrappedFarmTokenAttributesModelV2,
    ): Promise<typeof FarmTokenAttributesUnion> {
        try {
            const proxyAddress = await this.proxyService.getProxyAddressByToken(
                tokenCollection(parent.identifier),
            );

            return await this.proxyService.getFarmTokenAttributes(
                proxyAddress,
                parent.farmToken.tokenIdentifier,
                parent.farmToken.tokenNonce,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async lockedAssetsAttributes(
        @Parent() parent: WrappedFarmTokenAttributesModelV2,
    ): Promise<typeof LockedAssetAttributesUnion> {
        try {
            const [proxyAddress, oldLockedAssetID] = await Promise.all([
                this.proxyService.getProxyAddressByToken(
                    tokenCollection(parent.identifier),
                ),
                this.lockedAssetGetter.getLockedTokenID(),
            ]);
            const lockedLpTokenID =
                await this.proxyPairGetter.getwrappedLpTokenID(proxyAddress);
            if (parent.proxyFarmingToken.tokenIdentifier === lockedLpTokenID) {
                const wrappedLpToken =
                    await this.apiService.getNftByTokenIdentifier(
                        proxyAddress,
                        tokenIdentifier(
                            parent.proxyFarmingToken.tokenIdentifier,
                            parent.proxyFarmingToken.tokenNonce,
                        ),
                    );
                const wrappedLpTokenDecodedAttributes =
                    await this.proxyService.decodeWrappedLpTokenAttributesV2({
                        attributes: wrappedLpToken.attributes,
                        identifier: wrappedLpToken.identifier,
                    });
                if (
                    wrappedLpTokenDecodedAttributes.lockedTokens
                        .tokenIdentifier === oldLockedAssetID
                ) {
                    return this.proxyService.getLockedAssetsAttributes(
                        proxyAddress,
                        wrappedLpTokenDecodedAttributes.lockedTokens
                            .tokenIdentifier,
                        wrappedLpTokenDecodedAttributes.lockedTokens.tokenNonce,
                    );
                }
                return this.proxyService.getLockedTokenAttributes(
                    proxyAddress,
                    wrappedLpTokenDecodedAttributes.lockedTokens
                        .tokenIdentifier,
                    wrappedLpTokenDecodedAttributes.lockedTokens.tokenNonce,
                );
            }
            if (parent.proxyFarmingToken.tokenIdentifier === oldLockedAssetID) {
                return this.proxyService.getLockedAssetsAttributes(
                    proxyAddress,
                    parent.proxyFarmingToken.tokenIdentifier,
                    parent.proxyFarmingToken.tokenNonce,
                );
            }
            return this.proxyService.getLockedTokenAttributes(
                proxyAddress,
                parent.proxyFarmingToken.tokenIdentifier,
                parent.proxyFarmingToken.tokenNonce,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async lockedLpProxyTokenAttributes(
        @Parent() parent: WrappedFarmTokenAttributesModelV2,
    ): Promise<WrappedLpTokenAttributesModelV2> {
        try {
            const proxyAddress = await this.proxyService.getProxyAddressByToken(
                tokenCollection(parent.identifier),
            );
            const wrappedLpTokenCollection =
                await this.proxyPairGetter.getwrappedLpTokenID(proxyAddress);
            if (
                wrappedLpTokenCollection !=
                parent.proxyFarmingToken.tokenIdentifier
            ) {
                return null;
            }
            const wrappedLpToken =
                await this.apiService.getNftByTokenIdentifier(
                    proxyAddress,
                    tokenIdentifier(
                        parent.proxyFarmingToken.tokenIdentifier,
                        parent.proxyFarmingToken.tokenNonce,
                    ),
                );
            return await this.proxyService.decodeWrappedLpTokenAttributesV2({
                attributes: wrappedLpToken.attributes,
                identifier: wrappedLpToken.identifier,
            });
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @Query(() => [WrappedFarmTokenAttributesModelV2])
    async wrappedFarmTokenAttributesV2(
        @Args('args')
        args: DecodeAttributesArgs,
    ): Promise<WrappedFarmTokenAttributesModelV2[]> {
        return await this.proxyService.getWrappedFarmTokenAttributesV2(args);
    }
}
