import { Resolver, ResolveField, Parent } from '@nestjs/graphql';
import { ProxyPairGetterService } from './services/proxy-pair/proxy-pair.getter.service';
import { ProxyModel } from './models/proxy.model';
import { ProxyFarmGetterService } from './services/proxy-farm/proxy-farm.getter.service';
import { ProxyService } from './services/proxy.service';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import { NftCollection } from 'src/modules/tokens/models/nftCollection.model';
import { ApolloError } from 'apollo-server-express';
import { ProxyGetterServiceV1 } from './v1/services/proxy.v1.getter.service';
import { ProxyGetterServiceV2 } from './v2/services/proxy.v2.getter.service';
import { proxyVersion } from 'src/utils/proxy.utils';

@Resolver(() => ProxyModel)
export class ProxyResolver {
    constructor(
        protected readonly proxyGetter: ProxyGetterServiceV1,
        protected readonly proxyGetterV2: ProxyGetterServiceV2,
        protected readonly proxyService: ProxyService,
        protected readonly proxyPairGetter: ProxyPairGetterService,
        protected readonly proxyFarmGetter: ProxyFarmGetterService,
    ) {}

    @ResolveField()
    async lockedAssetTokens(
        @Parent() parent: ProxyModel,
    ): Promise<NftCollection[]> {
        try {
            const version = proxyVersion(parent.address);
            switch (version) {
                case 'v1':
                    return await this.proxyGetter.getlockedAssetToken(
                        parent.address,
                    );
                case 'v2':
                    return await this.proxyGetterV2.getlockedAssetToken(
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
            return await this.proxyPairGetter.getwrappedLpToken(parent.address);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async wrappedFarmToken(
        @Parent() parent: ProxyModel,
    ): Promise<NftCollection> {
        try {
            return await this.proxyFarmGetter.getwrappedFarmToken(
                parent.address,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async assetToken(@Parent() parent: ProxyModel): Promise<EsdtToken> {
        try {
            return await this.proxyGetter.getAssetToken(parent.address);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async intermediatedPairs(@Parent() parent: ProxyModel): Promise<string[]> {
        try {
            return await this.proxyPairGetter.getIntermediatedPairs(
                parent.address,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async intermediatedFarms(@Parent() parent: ProxyModel): Promise<string[]> {
        try {
            return await this.proxyFarmGetter.getIntermediatedFarms(
                parent.address,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }
}
