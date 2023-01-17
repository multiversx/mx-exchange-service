import { UseGuards } from '@nestjs/common';
import { Args, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { ApolloError } from 'apollo-server-express';
import { AuthUser } from '../auth/auth.user';
import { UserAuthResult } from '../auth/user.auth.result';
import { TransactionModel } from 'src/models/transaction.model';
import { GqlAdminGuard } from '../auth/gql.admin.guard';
import { GqlAuthGuard } from '../auth/gql.auth.guard';
import { BatchFarmRewardsComputeArgs } from '../farm/models/farm.args';
import { DecodeAttributesArgs } from '../proxy/models/proxy.args';
import {
    StakeFarmArgs,
    GenericStakeFarmArgs,
    ClaimRewardsWithNewValueArgs,
} from './models/staking.args';
import { StakingModel, StakingRewardsModel } from './models/staking.model';
import {
    StakingTokenAttributesModel,
    UnbondTokenAttributesModel,
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
            return await this.stakingGetterService.getMinUnbondEpochs(
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
    async lockedAssetFactoryManagedAddress(@Parent() parent: StakingModel) {
        try {
            return await this.stakingGetterService.getLockedAssetFactoryManagedAddress(
                parent.address,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async pairContractManagedAddress(@Parent() parent: StakingModel) {
        try {
            return await this.stakingGetterService.getPairContractManagedAddress(
                parent.address,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async burnGasLimit(@Parent() parent: StakingModel) {
        try {
            return await this.stakingGetterService.getBurnGasLimit(
                parent.address,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async transferExecGasLimit(@Parent() parent: StakingModel) {
        try {
            return await this.stakingGetterService.getTransferExecGasLimit(
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

    @Query(() => String)
    async getLastErrorMessage(
        @Args('stakeAddress') stakeAddress: string,
    ): Promise<string> {
        try {
            return await this.stakingGetterService.getLastErrorMessage(
                stakeAddress,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => [StakingTokenAttributesModel])
    async stakingTokenAttributes(
        @Args('args') args: DecodeAttributesArgs,
    ): Promise<StakingTokenAttributesModel[]> {
        try {
            return this.stakingService.decodeStakingTokenAttributes(args);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => [UnbondTokenAttributesModel])
    async unboundTokenAttributes(
        @Args('args') args: DecodeAttributesArgs,
    ): Promise<UnbondTokenAttributesModel[]> {
        try {
            return this.stakingService.decodeUnboundTokenAttributes(args);
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
            return await this.stakingService.getFarmsStaking();
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => TransactionModel)
    async stakeFarm(
        @Args() args: StakeFarmArgs,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        try {
            return await this.stakingTransactionService.stakeFarm(
                user.address,
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
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        try {
            return await this.stakingTransactionService.unstakeFarm(
                user.address,
                args.farmStakeAddress,
                args.payment,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAdminGuard)
    @Query(() => TransactionModel)
    async setPenaltyPercent(
        @Args('farmStakeAddress') farmStakeAddress: string,
        @Args('percent') percent: number,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        try {
            await this.stakingService.requireOwner(
                farmStakeAddress,
                user.address,
            );
            return await this.stakingTransactionService.setPenaltyPercent(
                farmStakeAddress,
                percent,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAdminGuard)
    @Query(() => TransactionModel)
    async setMinimumFarmingEpochs(
        @Args('farmStakeAddress') farmStakeAddress: string,
        @Args('epochs') epochs: number,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        try {
            await this.stakingService.requireOwner(
                farmStakeAddress,
                user.address,
            );
            return await this.stakingTransactionService.setMinimumFarmingEpochs(
                farmStakeAddress,
                epochs,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAdminGuard)
    @Query(() => TransactionModel)
    async setPerBlockRewardAmount(
        @Args('farmStakeAddress') farmStakeAddress: string,
        @Args('perBlockAmount') perBlockAmount: string,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        try {
            await this.stakingService.requireOwner(
                farmStakeAddress,
                user.address,
            );
            return await this.stakingTransactionService.setPerBlockRewardAmount(
                farmStakeAddress,
                perBlockAmount,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAdminGuard)
    @Query(() => TransactionModel)
    async setMaxApr(
        @Args('farmStakeAddress') farmStakeAddress: string,
        @Args('maxApr') maxApr: number,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        try {
            await this.stakingService.requireOwner(
                farmStakeAddress,
                user.address,
            );
            return await this.stakingTransactionService.setMaxApr(
                farmStakeAddress,
                maxApr,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAdminGuard)
    @Query(() => TransactionModel)
    async setMinUnbondEpochs(
        @Args('farmStakeAddress') farmStakeAddress: string,
        @Args('minUnboundEpoch') minUnboundEpoch: number,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        try {
            await this.stakingService.requireOwner(
                farmStakeAddress,
                user.address,
            );
            return await this.stakingTransactionService.setMinUnbondEpochs(
                farmStakeAddress,
                minUnboundEpoch,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAdminGuard)
    @Query(() => TransactionModel)
    async startProduceRewards(
        @Args('farmStakeAddress') farmStakeAddress: string,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        try {
            await this.stakingService.requireOwner(
                farmStakeAddress,
                user.address,
            );
            return await this.stakingTransactionService.setRewardsState(
                farmStakeAddress,
                true,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAdminGuard)
    @Query(() => TransactionModel)
    async endProduceRewards(
        @Args('farmStakeAddress') farmStakeAddress: string,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        try {
            await this.stakingService.requireOwner(
                farmStakeAddress,
                user.address,
            );
            return await this.stakingTransactionService.setRewardsState(
                farmStakeAddress,
                false,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAdminGuard)
    @Query(() => TransactionModel)
    async setBurnGasLimit(
        @Args('farmStakeAddress') farmStakeAddress: string,
        @Args('gasLimit') gasLimit: number,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        try {
            await this.stakingService.requireOwner(
                farmStakeAddress,
                user.address,
            );
            return await this.stakingTransactionService.setBurnGasLimit(
                farmStakeAddress,
                gasLimit,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAdminGuard)
    @Query(() => TransactionModel)
    async setTransferExecGasLimit(
        @Args('farmStakeAddress') farmStakeAddress: string,
        @Args('gasLimit') gasLimit: number,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        try {
            await this.stakingService.requireOwner(
                farmStakeAddress,
                user.address,
            );
            return await this.stakingTransactionService.setTransferExecGasLimit(
                farmStakeAddress,
                gasLimit,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAdminGuard)
    @Query(() => TransactionModel)
    async addAddressToWhitelist(
        @Args('farmStakeAddress') farmStakeAddress: string,
        @Args('address') address: string,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        try {
            await this.stakingService.requireOwner(
                farmStakeAddress,
                user.address,
            );
            return await this.stakingTransactionService.setAddressWhitelist(
                farmStakeAddress,
                address,
                true,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAdminGuard)
    @Query(() => TransactionModel)
    async removeAddressFromWhitelist(
        @Args('farmStakeAddress') farmStakeAddress: string,
        @Args('address') address: string,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        try {
            await this.stakingService.requireOwner(
                farmStakeAddress,
                user.address,
            );
            return await this.stakingTransactionService.setAddressWhitelist(
                farmStakeAddress,
                address,
                false,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAdminGuard)
    @Query(() => TransactionModel)
    async registerFarmToken(
        @Args('farmStakeAddress') farmStakeAddress: string,
        @Args('tokenDisplayName') tokenDisplayName: string,
        @Args('tokenTicker') tokenTicker: string,
        @Args('decimals') decimals: number,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        try {
            await this.stakingService.requireOwner(
                farmStakeAddress,
                user.address,
            );
            return await this.stakingTransactionService.registerFarmToken(
                farmStakeAddress,
                tokenDisplayName,
                tokenTicker,
                decimals,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAdminGuard)
    @Query(() => TransactionModel)
    async pause(
        @Args('farmStakeAddress') farmStakeAddress: string,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        try {
            await this.stakingService.requireOwner(
                farmStakeAddress,
                user.address,
            );
            return await this.stakingTransactionService.setState(
                farmStakeAddress,
                false,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAdminGuard)
    @Query(() => TransactionModel)
    async resume(
        @Args('farmStakeAddress') farmStakeAddress: string,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        try {
            await this.stakingService.requireOwner(
                farmStakeAddress,
                user.address,
            );
            return await this.stakingTransactionService.setState(
                farmStakeAddress,
                true,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAdminGuard)
    @Query(() => TransactionModel)
    async setLocalRolesFarmToken(
        @Args('farmStakeAddress') farmStakeAddress: string,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        try {
            await this.stakingService.requireOwner(
                farmStakeAddress,
                user.address,
            );
            return await this.stakingTransactionService.setLocalRolesFarmToken(
                farmStakeAddress,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => TransactionModel)
    async unbondFarm(
        @Args() args: GenericStakeFarmArgs,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        try {
            return await this.stakingTransactionService.unbondFarm(
                user.address,
                args.farmStakeAddress,
                args.payment,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => TransactionModel)
    async claimStakingRewards(
        @Args() args: GenericStakeFarmArgs,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        try {
            return await this.stakingTransactionService.claimRewards(
                user.address,
                args.farmStakeAddress,
                args.payment,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => TransactionModel)
    async claimStakingRewardsWithNewValue(
        @Args() args: ClaimRewardsWithNewValueArgs,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        try {
            return await this.stakingTransactionService.claimRewardsWithNewValue(
                user.address,
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
    async compoundStakingRewards(
        @Args() args: GenericStakeFarmArgs,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        try {
            return await this.stakingTransactionService.compoundRewards(
                user.address,
                args.farmStakeAddress,
                args.payment,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAdminGuard)
    @Query(() => TransactionModel)
    async topUpRewards(
        @Args() args: GenericStakeFarmArgs,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        try {
            await this.stakingService.requireOwner(
                args.farmStakeAddress,
                user.address,
            );
            return await this.stakingTransactionService.topUpRewards(
                args.farmStakeAddress,
                args.payment,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => TransactionModel)
    async mergeStakeFarmTokens(
        @Args() args: StakeFarmArgs,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        try {
            return await this.stakingTransactionService.mergeFarmTokens(
                user.address,
                args.farmStakeAddress,
                args.payments,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }
}
