import { Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { ApolloError } from 'apollo-server-express';
import { EsdtToken } from 'src/models/tokens/esdtToken.model';
import { NftCollection } from 'src/models/tokens/nftCollection.model';
import { PriceDiscoveryModel } from './models/price.discovery.model';
import { PriceDiscoveryGetterService } from './services/price.discovery.getter.service';
import { PriceDiscoveryService } from './services/price.discovery.service';

@Resolver(() => PriceDiscoveryModel)
export class PriceDiscoveryResolver {
    constructor(
        private readonly priceDiscoveryService: PriceDiscoveryService,
        private readonly priceDiscoveryGetter: PriceDiscoveryGetterService,
    ) {}

    private async genericFieldResover(fieldResolver: () => any): Promise<any> {
        try {
            return await fieldResolver();
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async launchedToken(
        @Parent() parent: PriceDiscoveryModel,
    ): Promise<EsdtToken> {
        return await this.genericFieldResover(() =>
            this.priceDiscoveryGetter.getLaunchedToken(parent.address),
        );
    }

    @ResolveField()
    async acceptedToken(
        @Parent() parent: PriceDiscoveryModel,
    ): Promise<EsdtToken> {
        return await this.genericFieldResover(() =>
            this.priceDiscoveryGetter.getAcceptedToken(parent.address),
        );
    }

    @ResolveField()
    async redeemToken(
        @Parent() parent: PriceDiscoveryModel,
    ): Promise<NftCollection> {
        return await this.genericFieldResover(() =>
            this.priceDiscoveryGetter.getRedeemToken(parent.address),
        );
    }

    @ResolveField()
    async lpToken(@Parent() parent: PriceDiscoveryModel): Promise<EsdtToken> {
        return await this.genericFieldResover(() =>
            this.priceDiscoveryGetter.getLpToken(parent.address),
        );
    }

    @ResolveField()
    async launchedTokenAmount(
        @Parent() parent: PriceDiscoveryModel,
    ): Promise<string> {
        return await this.genericFieldResover(() =>
            this.priceDiscoveryGetter.getLaunchedTokenAmount(parent.address),
        );
    }

    @ResolveField()
    async acceptedTokenAmount(
        @Parent() parent: PriceDiscoveryModel,
    ): Promise<string> {
        return await this.genericFieldResover(() =>
            this.priceDiscoveryGetter.getAcceptedTokenAmount(parent.address),
        );
    }

    @ResolveField()
    async lpTokensReceived(
        @Parent() parent: PriceDiscoveryModel,
    ): Promise<string> {
        return await this.genericFieldResover(() =>
            this.priceDiscoveryGetter.getLpTokensReceived(parent.address),
        );
    }

    @ResolveField()
    async startBlock(@Parent() parent: PriceDiscoveryModel): Promise<number> {
        return await this.genericFieldResover(() =>
            this.priceDiscoveryGetter.getStartBlock(parent.address),
        );
    }

    @ResolveField()
    async endBlock(@Parent() parent: PriceDiscoveryModel): Promise<number> {
        return await this.genericFieldResover(() =>
            this.priceDiscoveryGetter.getEndBlock(parent.address),
        );
    }

    @ResolveField()
    async pairAddress(@Parent() parent: PriceDiscoveryModel): Promise<string> {
        return await this.genericFieldResover(() =>
            this.priceDiscoveryGetter.getPairAddress(parent.address),
        );
    }

    @Query(() => [PriceDiscoveryModel])
    async priceDiscoveryContracts(): Promise<PriceDiscoveryModel[]> {
        return this.priceDiscoveryService.getPriceDiscoveryContracts();
    }
}
