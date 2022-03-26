import { UseGuards } from '@nestjs/common';
import { Args, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { ApolloError } from 'apollo-server-express';
import { User } from 'src/helpers/userDecorator';
import { InputTokenModel } from 'src/models/inputToken.model';
import { EsdtToken } from 'src/models/tokens/esdtToken.model';
import { NftCollection } from 'src/models/tokens/nftCollection.model';
import { TransactionModel } from 'src/models/transaction.model';
import { GqlAuthGuard } from '../auth/gql.auth.guard';
import {
    PhaseModel,
    PriceDiscoveryModel,
} from './models/price.discovery.model';
import { PriceDiscoveryGetterService } from './services/price.discovery.getter.service';
import { PriceDiscoveryService } from './services/price.discovery.service';
import { PriceDiscoveryTransactionService } from './services/price.discovery.transactions.service';

@Resolver(() => PriceDiscoveryModel)
export class PriceDiscoveryResolver {
    constructor(
        private readonly priceDiscoveryService: PriceDiscoveryService,
        private readonly priceDiscoveryGetter: PriceDiscoveryGetterService,
        private readonly priceDiscoveryTransactions: PriceDiscoveryTransactionService,
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
    async launchedTokenPrice(
        @Parent() parent: PriceDiscoveryModel,
    ): Promise<string> {
        return await this.genericFieldResover(() =>
            this.priceDiscoveryGetter.getLaunchedTokenPrice(parent.address),
        );
    }

    @ResolveField()
    async acceptedTokenPrice(
        @Parent() parent: PriceDiscoveryModel,
    ): Promise<string> {
        return await this.genericFieldResover(() =>
            this.priceDiscoveryGetter.getAcceptedTokenPrice(parent.address),
        );
    }

    @ResolveField()
    async launchedTokenPriceUSD(
        @Parent() parent: PriceDiscoveryModel,
    ): Promise<string> {
        return await this.genericFieldResover(() =>
            this.priceDiscoveryGetter.getLaunchedTokenPriceUSD(parent.address),
        );
    }

    @ResolveField()
    async acceptedTokenPriceUSD(
        @Parent() parent: PriceDiscoveryModel,
    ): Promise<string> {
        return await this.genericFieldResover(() =>
            this.priceDiscoveryGetter.getAcceptedTokenPriceUSD(parent.address),
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
    async unbondPeriodBlocks(
        @Parent() parent: PriceDiscoveryModel,
    ): Promise<number> {
        return await this.genericFieldResover(() =>
            this.priceDiscoveryGetter.getUnbondPeriodBlocks(parent.address),
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

    @UseGuards(GqlAuthGuard)
    @Query(() => [TransactionModel])
    async depositBatchOnPriceDiscovery(
        @Args('priceDiscoveryAddress') priceDiscoveryAddress: string,
        @Args('inputTokens') inputTokens: InputTokenModel,
        @User() user: any,
    ): Promise<TransactionModel[]> {
        try {
            return await this.priceDiscoveryTransactions.depositBatch(
                priceDiscoveryAddress,
                user.publicKey,
                inputTokens,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => TransactionModel)
    async depositOnPriceDiscovery(
        @Args('priceDiscoveryAddress') priceDiscoveryAddress: string,
        @Args('inputTokens') inputTokens: InputTokenModel,
    ): Promise<TransactionModel> {
        try {
            return await this.priceDiscoveryTransactions.deposit(
                priceDiscoveryAddress,
                inputTokens,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => [TransactionModel])
    async withdrawBatchFromPriceDiscovery(
        @Args('priceDiscoveryAddress') priceDiscoveryAddress: string,
        @Args('inputTokens') inputTokens: InputTokenModel,
        @User() user: any,
    ): Promise<TransactionModel[]> {
        try {
            return await this.priceDiscoveryTransactions.genericBatchRedeemInteraction(
                priceDiscoveryAddress,
                user.publicKey,
                inputTokens,
                'withdraw',
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => TransactionModel)
    async withdrawFromPriceDiscovery(
        @Args('priceDiscoveryAddress') priceDiscoveryAddress: string,
        @Args('inputTokens') inputTokens: InputTokenModel,
        @User() user: any,
    ): Promise<TransactionModel> {
        try {
            return await this.priceDiscoveryTransactions.genericRedeemInteraction(
                priceDiscoveryAddress,
                user.publicKey,
                inputTokens,
                'withdraw',
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => [TransactionModel])
    async redeemTokensBatchFromPriceDiscovery(
        @Args('priceDiscoveryAddress') priceDiscoveryAddress: string,
        @Args('inputTokens') inputTokens: InputTokenModel,
        @User() user: any,
    ): Promise<TransactionModel[]> {
        try {
            return await this.priceDiscoveryTransactions.genericBatchRedeemInteraction(
                priceDiscoveryAddress,
                user.publicKey,
                inputTokens,
                'redeem',
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => TransactionModel)
    async redeemTokensFromPriceDiscovery(
        @Args('priceDiscoveryAddress') priceDiscoveryAddress: string,
        @Args('inputTokens') inputTokens: InputTokenModel,
        @User() user: any,
    ): Promise<TransactionModel> {
        try {
            return await this.priceDiscoveryTransactions.genericRedeemInteraction(
                priceDiscoveryAddress,
                user.publicKey,
                inputTokens,
                'redeem',
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }
}
