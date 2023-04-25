import { Resolver, ResolveField, Parent } from '@nestjs/graphql';
import { ProxyModel } from './models/proxy.model';
import { ProxyService } from './services/proxy.service';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import { NftCollection } from 'src/modules/tokens/models/nftCollection.model';
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
        return this.proxyService.getlockedAssetToken(parent.address);
    }

    @ResolveField()
    async wrappedLpToken(@Parent() parent: ProxyModel): Promise<NftCollection> {
        return this.proxyService.getwrappedLpToken(parent.address);
    }

    @ResolveField()
    async wrappedFarmToken(
        @Parent() parent: ProxyModel,
    ): Promise<NftCollection> {
        return this.proxyService.getwrappedFarmToken(parent.address);
    }

    @ResolveField()
    async assetToken(@Parent() parent: ProxyModel): Promise<EsdtToken> {
        return this.proxyService.getAssetToken(parent.address);
    }

    @ResolveField()
    async intermediatedPairs(@Parent() parent: ProxyModel): Promise<string[]> {
        return this.proxyPairAbi.intermediatedPairs(parent.address);
    }

    @ResolveField()
    async intermediatedFarms(@Parent() parent: ProxyModel): Promise<string[]> {
        return this.proxyFarmAbi.intermediatedFarms(parent.address);
    }
}
