import { Resolver, ResolveField, Parent } from '@nestjs/graphql';
import { ProxyModel } from './models/proxy.model';
import { ProxyService } from './services/proxy.service';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import { NftCollection } from 'src/modules/tokens/models/nftCollection.model';
import { ApolloError } from 'apollo-server-express';
import { proxyVersion } from 'src/utils/proxy.utils';
import { ProxyPairAbiService } from './services/proxy-pair/proxy.pair.abi.service';
import { ProxyFarmAbiService } from './services/proxy-farm/proxy.farm.abi.service';

@Resolver(() => ProxyModel)
export class ProxyResolver {
    constructor(
        private readonly proxyService: ProxyService,
        private readonly proxyPairAbi: ProxyPairAbiService,
        private readonly proxyFarmAbi: ProxyFarmAbiService,
    ) {}

    @ResolveField()
    async lockedAssetTokens(
        @Parent() parent: ProxyModel,
    ): Promise<NftCollection[]> {
        try {
            const version = proxyVersion(parent.address);
            switch (version) {
                case 'v1':
                    return await this.proxyService.getlockedAssetToken(
                        parent.address,
                    );
                case 'v2':
                    return await this.proxyService.getlockedAssetToken(
                        parent.address,
                    );
            }
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async wrappedLpToken(@Parent() parent: ProxyModel): Promise<NftCollection> {
        try {
            return await this.proxyService.getwrappedLpToken(parent.address);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async wrappedFarmToken(
        @Parent() parent: ProxyModel,
    ): Promise<NftCollection> {
        try {
            return await this.proxyService.getwrappedFarmToken(parent.address);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async assetToken(@Parent() parent: ProxyModel): Promise<EsdtToken> {
        try {
            return await this.proxyService.getAssetToken(parent.address);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async intermediatedPairs(@Parent() parent: ProxyModel): Promise<string[]> {
        try {
            return await this.proxyPairAbi.intermediatedPairs(parent.address);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async intermediatedFarms(@Parent() parent: ProxyModel): Promise<string[]> {
        try {
            return await this.proxyFarmAbi.intermediatedFarms(parent.address);
        } catch (error) {
            throw new ApolloError(error);
        }
    }
}
