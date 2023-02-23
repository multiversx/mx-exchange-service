import { Args, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { ApolloError } from 'apollo-server-express';
import { scAddress } from 'src/config';
import { MXApiService } from 'src/services/multiversx-communication/mx.api.service';
import { tokenIdentifier } from 'src/utils/token.converters';
import { FarmTokenAttributesUnion } from '../farm/models/farmTokenAttributes.model';
import { DecodeAttributesArgs } from './models/proxy.args';
import { WrappedFarmTokenAttributesModelV2 } from './models/wrappedFarmTokenAttributes.model';
import { WrappedLpTokenAttributesModelV2 } from './models/wrappedLpTokenAttributes.model';
import { ProxyService } from './services/proxy.service';

@Resolver(() => WrappedFarmTokenAttributesModelV2)
export class WrappedFarmTokenResolverV2 {
    constructor(
        private readonly proxyService: ProxyService,
        private readonly apiService: MXApiService,
    ) {}

    @ResolveField()
    async farmTokenAttributes(
        @Parent() parent: WrappedFarmTokenAttributesModelV2,
    ): Promise<typeof FarmTokenAttributesUnion> {
        try {
            return await this.proxyService.getFarmTokenAttributes(
                scAddress.proxyDexAddress.v2,
                parent.farmToken.tokenIdentifier,
                parent.farmToken.tokenNonce,
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
            const wrappedLpToken =
                await this.apiService.getNftByTokenIdentifier(
                    scAddress.proxyDexAddress.v2,
                    tokenIdentifier(
                        parent.proxyFarmingToken.tokenIdentifier,
                        parent.proxyFarmingToken.tokenNonce,
                    ),
                );
            return this.proxyService.decodeWrappedLpTokenAttributesV2({
                attributes: wrappedLpToken.attributes,
                identifier: wrappedLpToken.identifier,
            });
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @Query(() => [WrappedFarmTokenAttributesModelV2])
    wrappedFarmTokenAttributesV2(
        @Args('args')
        args: DecodeAttributesArgs,
    ): WrappedFarmTokenAttributesModelV2[] {
        return this.proxyService.getWrappedFarmTokenAttributesV2(args);
    }
}
