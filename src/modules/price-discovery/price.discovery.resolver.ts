import { Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { ApolloError } from 'apollo-server-express';
import { EsdtToken } from 'src/models/tokens/esdtToken.model';
import { NftCollection } from 'src/models/tokens/nftCollection.model';
import {
    PhaseModel,
    PriceDiscoveryModel,
} from './models/price.discovery.model';
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
    async rewardsToken(
        @Parent() parent: PriceDiscoveryModel,
    ): Promise<EsdtToken> {
        return await this.genericFieldResover(() =>
            this.priceDiscoveryGetter.getRewardsToken(parent.address),
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
    async extraRewards(@Parent() parent: PriceDiscoveryModel): Promise<string> {
        return await this.genericFieldResover(() =>
            this.priceDiscoveryGetter.getExtraRewards(parent.address),
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

    @ResolveField()
    async currentPhase(
        @Parent() parent: PriceDiscoveryModel,
    ): Promise<PhaseModel> {
        return await this.genericFieldResover(() =>
            this.priceDiscoveryGetter.getCurrentPhase(parent.address),
        );
    }

    @ResolveField()
    async minLaunchedTokenPrice(
        @Parent() parent: PriceDiscoveryModel,
    ): Promise<string> {
        return await this.genericFieldResover(() =>
            this.priceDiscoveryGetter.getMinLaunchedTokenPrice(parent.address),
        );
    }

    @ResolveField()
    async noLimitPhaseDurationBlocks(
        @Parent() parent: PriceDiscoveryModel,
    ): Promise<number> {
        return await this.genericFieldResover(() =>
            this.priceDiscoveryGetter.getNoLimitPhaseDurationBlocks(
                parent.address,
            ),
        );
    }

    @ResolveField()
    async linearPenaltyPhaseDurationBlocks(
        @Parent() parent: PriceDiscoveryModel,
    ): Promise<number> {
        return await this.genericFieldResover(() =>
            this.priceDiscoveryGetter.getLinearPenaltyPhaseDurationBlocks(
                parent.address,
            ),
        );
    }

    @ResolveField()
    async fixedPenaltyPhaseDurationBlocks(
        @Parent() parent: PriceDiscoveryModel,
    ): Promise<number> {
        return await this.genericFieldResover(() =>
            this.priceDiscoveryGetter.getFixedPenaltyPhaseDurationBlocks(
                parent.address,
            ),
        );
    }

    @ResolveField()
    async unbondPeriodEpochs(
        @Parent() parent: PriceDiscoveryModel,
    ): Promise<number> {
        return await this.genericFieldResover(() =>
            this.priceDiscoveryGetter.getUnbondPeriodEpochs(parent.address),
        );
    }

    @ResolveField()
    async penaltyMinPercentage(
        @Parent() parent: PriceDiscoveryModel,
    ): Promise<string> {
        return await this.genericFieldResover(() =>
            this.priceDiscoveryGetter.getPenaltyMinPercentage(parent.address),
        );
    }

    @ResolveField()
    async penaltyMaxPercentage(
        @Parent() parent: PriceDiscoveryModel,
    ): Promise<string> {
        return await this.genericFieldResover(() =>
            this.priceDiscoveryGetter.getPenaltyMaxPercentage(parent.address),
        );
    }

    @ResolveField()
    async fixedPenaltyPercentage(
        @Parent() parent: PriceDiscoveryModel,
    ): Promise<string> {
        return await this.genericFieldResover(() =>
            this.priceDiscoveryGetter.getFixedPenaltyPercentage(parent.address),
        );
    }

    @Query(() => [PriceDiscoveryModel])
    async priceDiscoveryContracts(): Promise<PriceDiscoveryModel[]> {
        return this.priceDiscoveryService.getPriceDiscoveryContracts();
    }
}
