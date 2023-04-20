import { UseGuards } from '@nestjs/common';
import { Args, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { ApolloError } from 'apollo-server-express';
import { AuthUser } from '../auth/auth.user';
import { UserAuthResult } from '../auth/user.auth.result';
import { TransactionModel } from 'src/models/transaction.model';
import { GqlAdminGuard } from '../auth/gql.admin.guard';
import { JwtOrNativeAuthGuard } from '../auth/jwt.or.native.auth.guard';
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
import { StakingService } from './services/staking.service';
import { StakingTransactionService } from './services/staking.transactions.service';
import { StakingAbiService } from './services/staking.abi.service';
import { StakingComputeService } from './services/staking.compute.service';

@Resolver(() => StakingModel)
export class StakingResolver {
    constructor(
        private readonly stakingService: StakingService,
        private readonly stakingAbi: StakingAbiService,
        private readonly stakingCompute: StakingComputeService,
        private readonly stakingTransactionService: StakingTransactionService,
    ) {}

    @ResolveField()
    async farmToken(@Parent() parent: StakingModel) {
        try {
            return await this.stakingService.getFarmToken(parent.address);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async farmingToken(@Parent() parent: StakingModel) {
        try {
            return await this.stakingService.getFarmingToken(parent.address);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async rewardToken(@Parent() parent: StakingModel) {
        try {
            return await this.stakingService.getRewardToken(parent.address);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async farmTokenSupply(@Parent() parent: StakingModel) {
        try {
            return await this.stakingAbi.farmTokenSupply(parent.address);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async rewardPerShare(@Parent() parent: StakingModel) {
        try {
            return await this.stakingAbi.rewardPerShare(parent.address);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async accumulatedRewards(@Parent() parent: StakingModel) {
        try {
            return await this.stakingAbi.accumulatedRewards(parent.address);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async rewardCapacity(@Parent() parent: StakingModel) {
        try {
            return await this.stakingAbi.rewardCapacity(parent.address);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async annualPercentageRewards(@Parent() parent: StakingModel) {
        try {
            return await this.stakingAbi.annualPercentageRewards(
                parent.address,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async apr(@Parent() parent: StakingModel) {
        try {
            return await this.stakingCompute.stakeFarmAPR(parent.address);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async minUnboundEpochs(@Parent() parent: StakingModel) {
        try {
            return await this.stakingAbi.minUnbondEpochs(parent.address);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async perBlockRewards(@Parent() parent: StakingModel) {
        try {
            return await this.stakingAbi.perBlockRewardsAmount(parent.address);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async lastRewardBlockNonce(@Parent() parent: StakingModel) {
        try {
            return await this.stakingAbi.lastRewardBlockNonce(parent.address);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async divisionSafetyConstant(@Parent() parent: StakingModel) {
        try {
            return await this.stakingAbi.divisionSafetyConstant(parent.address);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async produceRewardsEnabled(@Parent() parent: StakingModel) {
        try {
            return await this.stakingAbi.produceRewardsEnabled(parent.address);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async lockedAssetFactoryManagedAddress(@Parent() parent: StakingModel) {
        try {
            return await this.stakingAbi.lockedAssetFactoryAddress(
                parent.address,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async pairContractManagedAddress(@Parent() parent: StakingModel) {
        try {
            return await this.stakingAbi.pairContractAddress(parent.address);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async burnGasLimit(@Parent() parent: StakingModel) {
        try {
            return await this.stakingAbi.burnGasLimit(parent.address);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async transferExecGasLimit(@Parent() parent: StakingModel) {
        try {
            return await this.stakingAbi.transferExecGasLimit(parent.address);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async state(@Parent() parent: StakingModel) {
        try {
            return await this.stakingAbi.state(parent.address);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @Query(() => String)
    async getLastErrorMessage(
        @Args('stakeAddress') stakeAddress: string,
    ): Promise<string> {
        try {
            return await this.stakingAbi.lastErrorMessage(stakeAddress);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(JwtOrNativeAuthGuard)
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

    @UseGuards(JwtOrNativeAuthGuard)
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

    @UseGuards(JwtOrNativeAuthGuard)
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

    @UseGuards(JwtOrNativeAuthGuard)
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

    @UseGuards(JwtOrNativeAuthGuard)
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

    @UseGuards(JwtOrNativeAuthGuard)
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

    @UseGuards(JwtOrNativeAuthGuard)
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

    @UseGuards(JwtOrNativeAuthGuard)
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

    @UseGuards(JwtOrNativeAuthGuard)
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

    @UseGuards(JwtOrNativeAuthGuard)
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
