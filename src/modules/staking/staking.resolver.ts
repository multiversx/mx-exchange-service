import { UseGuards } from '@nestjs/common';
import { Args, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { ApolloError } from 'apollo-server-express';
import { User } from 'src/helpers/userDecorator';
import { TransactionModel } from 'src/models/transaction.model';
import { GqlAuthGuard } from '../auth/gql.auth.guard';
import { BatchFarmRewardsComputeArgs } from '../farm/models/farm.args';
import {
    StakeFarmArgs,
    GenericStakeFarmArgs,
    ClaimRewardsWithNewValueArgs,
} from './models/staking.args';
import { StakingModel, StakingRewardsModel } from './models/staking.model';
import {
    StakingTokenAttributesModel,
    UnboundTokenAttributesModel,
} from './models/stakingTokenAttributes.model';
import { StakingGetterService } from './services/staking.getter.service';
import { StakingService } from './services/staking.service';
import { StakingTransactionService } from './services/staking.transactions.service';

@Resolver(() => StakingModel)
export class StakingResolver {
    constructor(
        private readonly stakingService: StakingService,
        private readonly stakingGetterService: StakingGetterService,
        private readonly stakingTransactionService: StakingTransactionService,
    ) {}

    @ResolveField()
    async farmToken(@Parent() parent: StakingModel) {
        try {
            return await this.stakingGetterService.getFarmToken(parent.address);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async farmingToken(@Parent() parent: StakingModel) {
        try {
            return await this.stakingGetterService.getFarmingToken(
                parent.address,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async rewardToken(@Parent() parent: StakingModel) {
        try {
            return await this.stakingGetterService.getRewardToken(
                parent.address,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async farmTokenSupply(@Parent() parent: StakingModel) {
        try {
            return await this.stakingGetterService.getFarmTokenSupply(
                parent.address,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async rewardPerShare(@Parent() parent: StakingModel) {
        try {
            return await this.stakingGetterService.getRewardPerShare(
                parent.address,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async accumulatedRewards(@Parent() parent: StakingModel) {
        try {
            return await this.stakingGetterService.getAccumulatedRewards(
                parent.address,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async rewardCapacity(@Parent() parent: StakingModel) {
        try {
            return await this.stakingGetterService.getRewardCapacity(
                parent.address,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async annualPercentageRewards(@Parent() parent: StakingModel) {
        try {
            return await this.stakingGetterService.getAnnualPercentageRewards(
                parent.address,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async minUnboundEpochs(@Parent() parent: StakingModel) {
        try {
            return await this.stakingGetterService.getMinimumFarmingEpoch(
                parent.address,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async penaltyPercent(@Parent() parent: StakingModel) {
        try {
            return await this.stakingGetterService.getPenaltyPercent(
                parent.address,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async minimumFarmingEpochs(@Parent() parent: StakingModel) {
        try {
            return await this.stakingGetterService.getMinimumFarmingEpoch(
                parent.address,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async perBlockRewards(@Parent() parent: StakingModel) {
        try {
            return await this.stakingGetterService.getPerBlockRewardAmount(
                parent.address,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async lastRewardBlockNonce(@Parent() parent: StakingModel) {
        try {
            return await this.stakingGetterService.getLastRewardBlockNonce(
                parent.address,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async divisionSafetyConstant(@Parent() parent: StakingModel) {
        try {
            return await this.stakingGetterService.getDivisionSafetyConstant(
                parent.address,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async produceRewardsEnabled(@Parent() parent: StakingModel) {
        try {
            return await this.stakingGetterService.getProduceRewardsEnabled(
                parent.address,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async state(@Parent() parent: StakingModel) {
        try {
            return await this.stakingGetterService.getState(parent.address);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => StakingTokenAttributesModel)
    async stakingTokenAttributes(
        @Args('identifier') identifier: string,
        @Args('attributes') attributes: string,
    ): Promise<StakingTokenAttributesModel> {
        try {
            return this.stakingService.decodeStakingTokenAttributes(
                identifier,
                attributes,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => UnboundTokenAttributesModel)
    async unboundTokenAttributes(
        @Args('identifier') identifier: string,
        @Args('attributes') attributes: string,
    ): Promise<UnboundTokenAttributesModel> {
        try {
            return this.stakingService.decodeUnboundTokenAttributes(
                identifier,
                attributes,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => [StakingRewardsModel])
    async getStakingRewardsForPosition(
        @Args('stakingPositions') args: BatchFarmRewardsComputeArgs,
    ): Promise<StakingRewardsModel[]> {
        try {
            return await this.stakingService.getBatchRewardsForPosition(
                args.farmsPositions,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @Query(() => [StakingModel])
    async stakingFarms(): Promise<StakingModel[]> {
        try {
            return this.stakingService.getFarmsStaking();
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => TransactionModel)
    async stakeFarm(
        @Args() args: StakeFarmArgs,
        @User() user: any,
    ): Promise<TransactionModel> {
        try {
            return await this.stakingTransactionService.stakeFarm(
                user.publicKey,
                args.farmStakeAddress,
                args.payments,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => TransactionModel)
    async unstakeFarm(
        @Args() args: GenericStakeFarmArgs,
        @User() user: any,
    ): Promise<TransactionModel> {
        try {
            return await this.stakingTransactionService.unstakeFarm(
                user.publicKey,
                args.farmStakeAddress,
                args.payment,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => TransactionModel)
    async unbondFarm(
        @Args() args: GenericStakeFarmArgs,
        @User() user: any,
    ): Promise<TransactionModel> {
        try {
            return await this.stakingTransactionService.unbondFarm(
                user.publicKey,
                args.farmStakeAddress,
                args.payment,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => TransactionModel)
    async claimRewards(
        @Args() args: GenericStakeFarmArgs,
        @User() user: any,
    ): Promise<TransactionModel> {
        try {
            return await this.stakingTransactionService.claimRewards(
                user.publicKey,
                args.farmStakeAddress,
                args.payment,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => TransactionModel)
    async claimRewardsWithNewValue(
        @Args() args: ClaimRewardsWithNewValueArgs,
        @User() user: any,
    ): Promise<TransactionModel> {
        try {
            return await this.stakingTransactionService.claimRewardsWithNewValue(
                user.publicKey,
                args.farmStakeAddress,
                args.payment,
                args.newValue,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => TransactionModel)
    async compoundRewards(
        @Args() args: GenericStakeFarmArgs,
        @User() user: any,
    ): Promise<TransactionModel> {
        try {
            return await this.stakingTransactionService.compoundRewards(
                user.publicKey,
                args.farmStakeAddress,
                args.payment,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => TransactionModel)
    async mergeFarmTokens(
        @Args() args: StakeFarmArgs,
        @User() user: any,
    ): Promise<TransactionModel> {
        try {
            return await this.stakingTransactionService.mergeFarmTokens(
                user.publicKey,
                args.farmStakeAddress,
                args.payments,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }
}
