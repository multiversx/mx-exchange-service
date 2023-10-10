import { UseGuards } from '@nestjs/common';
import {
    Args,
    Int,
    Parent,
    Query,
    ResolveField,
    Resolver,
} from '@nestjs/graphql';
import { AuthUser } from '../auth/auth.user';
import { UserAuthResult } from '../auth/user.auth.result';
import { TransactionModel } from 'src/models/transaction.model';
import { JwtOrNativeAuthGuard } from '../auth/jwt.or.native.auth.guard';
import { BatchFarmRewardsComputeArgs } from '../farm/models/farm.args';
import { DecodeAttributesArgs } from '../proxy/models/proxy.args';
import {
    StakeFarmArgs,
    GenericStakeFarmArgs,
    ClaimRewardsWithNewValueArgs,
} from './models/staking.args';
import {
    OptimalCompoundModel,
    StakingModel,
    StakingRewardsModel,
} from './models/staking.model';
import {
    StakingTokenAttributesModel,
    UnbondTokenAttributesModel,
} from './models/stakingTokenAttributes.model';
import { StakingService } from './services/staking.service';
import { StakingTransactionService } from './services/staking.transactions.service';
import { StakingAbiService } from './services/staking.abi.service';
import { StakingComputeService } from './services/staking.compute.service';
import { JwtOrNativeAdminGuard } from '../auth/jwt.or.native.admin.guard';
import { WeekTimekeepingModel } from 'src/submodules/week-timekeeping/models/week-timekeeping.model';
import { WeekTimekeepingAbiService } from 'src/submodules/week-timekeeping/services/week-timekeeping.abi.service';

@Resolver(() => StakingModel)
export class StakingResolver {
    constructor(
        private readonly stakingService: StakingService,
        private readonly stakingAbi: StakingAbiService,
        private readonly stakingCompute: StakingComputeService,
        private readonly stakingTransactionService: StakingTransactionService,
        private readonly weekTimekeepingAbi: WeekTimekeepingAbiService,
    ) {}

    @ResolveField()
    async farmToken(@Parent() parent: StakingModel) {
        return this.stakingService.getFarmToken(parent.address);
    }

    @ResolveField()
    async farmingToken(@Parent() parent: StakingModel) {
        return this.stakingService.getFarmingToken(parent.address);
    }

    @ResolveField()
    async rewardToken(@Parent() parent: StakingModel) {
        return this.stakingService.getRewardToken(parent.address);
    }

    @ResolveField()
    async farmTokenSupply(@Parent() parent: StakingModel) {
        return this.stakingAbi.farmTokenSupply(parent.address);
    }

    @ResolveField()
    async rewardPerShare(@Parent() parent: StakingModel) {
        return this.stakingAbi.rewardPerShare(parent.address);
    }

    @ResolveField()
    async accumulatedRewards(@Parent() parent: StakingModel) {
        return this.stakingAbi.accumulatedRewards(parent.address);
    }

    @ResolveField()
    async rewardCapacity(@Parent() parent: StakingModel) {
        return this.stakingAbi.rewardCapacity(parent.address);
    }

    @ResolveField()
    async annualPercentageRewards(@Parent() parent: StakingModel) {
        return this.stakingAbi.annualPercentageRewards(parent.address);
    }

    @ResolveField()
    async apr(@Parent() parent: StakingModel) {
        return this.stakingCompute.stakeFarmAPR(parent.address);
    }

    @ResolveField()
    async minUnboundEpochs(@Parent() parent: StakingModel) {
        return this.stakingAbi.minUnbondEpochs(parent.address);
    }

    @ResolveField()
    async perBlockRewards(@Parent() parent: StakingModel) {
        return this.stakingAbi.perBlockRewardsAmount(parent.address);
    }

    @ResolveField()
    async lastRewardBlockNonce(@Parent() parent: StakingModel) {
        return this.stakingAbi.lastRewardBlockNonce(parent.address);
    }

    @ResolveField()
    async divisionSafetyConstant(@Parent() parent: StakingModel) {
        return this.stakingAbi.divisionSafetyConstant(parent.address);
    }

    @ResolveField()
    async produceRewardsEnabled(@Parent() parent: StakingModel) {
        return this.stakingAbi.produceRewardsEnabled(parent.address);
    }

    @ResolveField()
    async lockedAssetFactoryManagedAddress(@Parent() parent: StakingModel) {
        return this.stakingAbi.lockedAssetFactoryAddress(parent.address);
    }

    @ResolveField()
    async pairContractManagedAddress(@Parent() parent: StakingModel) {
        return this.stakingAbi.pairContractAddress(parent.address);
    }

    @ResolveField()
    async burnGasLimit(@Parent() parent: StakingModel) {
        return this.stakingAbi.burnGasLimit(parent.address);
    }

    @ResolveField()
    async transferExecGasLimit(@Parent() parent: StakingModel) {
        return this.stakingAbi.transferExecGasLimit(parent.address);
    }

    @ResolveField()
    async state(@Parent() parent: StakingModel) {
        return this.stakingAbi.state(parent.address);
    }

    @ResolveField()
    async time(@Parent() parent: StakingModel): Promise<WeekTimekeepingModel> {
        const currentWeek = await this.weekTimekeepingAbi.currentWeek(
            parent.address,
        );
        return new WeekTimekeepingModel({
            scAddress: parent.address,
            currentWeek: currentWeek,
        });
    }

    @Query(() => String)
    async getLastErrorMessage(
        @Args('stakeAddress') stakeAddress: string,
    ): Promise<string> {
        return this.stakingAbi.lastErrorMessage(stakeAddress);
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => [StakingTokenAttributesModel])
    async stakingTokenAttributes(
        @Args('args') args: DecodeAttributesArgs,
    ): Promise<StakingTokenAttributesModel[]> {
        return this.stakingService.decodeStakingTokenAttributes(args);
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => [UnbondTokenAttributesModel])
    async unboundTokenAttributes(
        @Args('args') args: DecodeAttributesArgs,
    ): Promise<UnbondTokenAttributesModel[]> {
        return this.stakingService.decodeUnboundTokenAttributes(args);
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => [StakingRewardsModel])
    async getStakingRewardsForPosition(
        @Args('stakingPositions') args: BatchFarmRewardsComputeArgs,
    ): Promise<StakingRewardsModel[]> {
        return this.stakingService.getBatchRewardsForPosition(
            args.farmsPositions,
        );
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => OptimalCompoundModel)
    async getOptimalCompoundFrequency(
        @Args('stakeAddress') stakeAddress: string,
        @Args('amount') amount: string,
        @Args('timeInterval') timeInterval: number,
    ): Promise<OptimalCompoundModel> {
        return this.stakingCompute.computeOptimalCompoundFrequency(
            stakeAddress,
            amount,
            timeInterval,
        );
    }

    @Query(() => [StakingModel])
    async stakingFarms(): Promise<StakingModel[]> {
        return this.stakingService.getFarmsStaking();
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => TransactionModel)
    async stakeFarm(
        @Args() args: StakeFarmArgs,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        return this.stakingTransactionService.stakeFarm(
            user.address,
            args.farmStakeAddress,
            args.payments,
        );
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => TransactionModel)
    async unstakeFarm(
        @Args() args: GenericStakeFarmArgs,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        return this.stakingTransactionService.unstakeFarm(
            user.address,
            args.farmStakeAddress,
            args.payment,
        );
    }

    @UseGuards(JwtOrNativeAdminGuard)
    @Query(() => TransactionModel)
    async setPenaltyPercent(
        @Args('farmStakeAddress') farmStakeAddress: string,
        @Args('percent') percent: number,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        await this.stakingService.requireOwner(farmStakeAddress, user.address);
        return this.stakingTransactionService.setPenaltyPercent(
            farmStakeAddress,
            percent,
        );
    }

    @UseGuards(JwtOrNativeAdminGuard)
    @Query(() => TransactionModel)
    async setMinimumFarmingEpochs(
        @Args('farmStakeAddress') farmStakeAddress: string,
        @Args('epochs') epochs: number,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        await this.stakingService.requireOwner(farmStakeAddress, user.address);
        return this.stakingTransactionService.setMinimumFarmingEpochs(
            farmStakeAddress,
            epochs,
        );
    }

    @UseGuards(JwtOrNativeAdminGuard)
    @Query(() => TransactionModel)
    async setPerBlockRewardAmount(
        @Args('farmStakeAddress') farmStakeAddress: string,
        @Args('perBlockAmount') perBlockAmount: string,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        await this.stakingService.requireOwner(farmStakeAddress, user.address);
        return this.stakingTransactionService.setPerBlockRewardAmount(
            farmStakeAddress,
            perBlockAmount,
        );
    }

    @UseGuards(JwtOrNativeAdminGuard)
    @Query(() => TransactionModel)
    async setMaxApr(
        @Args('farmStakeAddress') farmStakeAddress: string,
        @Args('maxApr') maxApr: number,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        await this.stakingService.requireOwner(farmStakeAddress, user.address);
        return this.stakingTransactionService.setMaxApr(
            farmStakeAddress,
            maxApr,
        );
    }

    @UseGuards(JwtOrNativeAdminGuard)
    @Query(() => TransactionModel)
    async setMinUnbondEpochs(
        @Args('farmStakeAddress') farmStakeAddress: string,
        @Args('minUnboundEpoch') minUnboundEpoch: number,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        await this.stakingService.requireOwner(farmStakeAddress, user.address);
        return this.stakingTransactionService.setMinUnbondEpochs(
            farmStakeAddress,
            minUnboundEpoch,
        );
    }

    @UseGuards(JwtOrNativeAdminGuard)
    @Query(() => TransactionModel)
    async startProduceRewards(
        @Args('farmStakeAddress') farmStakeAddress: string,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        await this.stakingService.requireOwner(farmStakeAddress, user.address);
        return this.stakingTransactionService.setRewardsState(
            farmStakeAddress,
            true,
        );
    }

    @UseGuards(JwtOrNativeAdminGuard)
    @Query(() => TransactionModel)
    async endProduceRewards(
        @Args('farmStakeAddress') farmStakeAddress: string,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        await this.stakingService.requireOwner(farmStakeAddress, user.address);
        return this.stakingTransactionService.setRewardsState(
            farmStakeAddress,
            false,
        );
    }

    @UseGuards(JwtOrNativeAdminGuard)
    @Query(() => TransactionModel)
    async setBurnGasLimit(
        @Args('farmStakeAddress') farmStakeAddress: string,
        @Args('gasLimit') gasLimit: number,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        await this.stakingService.requireOwner(farmStakeAddress, user.address);
        return this.stakingTransactionService.setBurnGasLimit(
            farmStakeAddress,
            gasLimit,
        );
    }

    @UseGuards(JwtOrNativeAdminGuard)
    @Query(() => TransactionModel)
    async setTransferExecGasLimit(
        @Args('farmStakeAddress') farmStakeAddress: string,
        @Args('gasLimit') gasLimit: number,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        await this.stakingService.requireOwner(farmStakeAddress, user.address);
        return this.stakingTransactionService.setTransferExecGasLimit(
            farmStakeAddress,
            gasLimit,
        );
    }

    @UseGuards(JwtOrNativeAdminGuard)
    @Query(() => TransactionModel)
    async addAddressToWhitelist(
        @Args('farmStakeAddress') farmStakeAddress: string,
        @Args('address') address: string,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        await this.stakingService.requireOwner(farmStakeAddress, user.address);
        return this.stakingTransactionService.setAddressWhitelist(
            farmStakeAddress,
            address,
            true,
        );
    }

    @UseGuards(JwtOrNativeAdminGuard)
    @Query(() => TransactionModel)
    async removeAddressFromWhitelist(
        @Args('farmStakeAddress') farmStakeAddress: string,
        @Args('address') address: string,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        await this.stakingService.requireOwner(farmStakeAddress, user.address);
        return this.stakingTransactionService.setAddressWhitelist(
            farmStakeAddress,
            address,
            false,
        );
    }

    @UseGuards(JwtOrNativeAdminGuard)
    @Query(() => TransactionModel)
    async registerFarmToken(
        @Args('farmStakeAddress') farmStakeAddress: string,
        @Args('tokenDisplayName') tokenDisplayName: string,
        @Args('tokenTicker') tokenTicker: string,
        @Args('decimals') decimals: number,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        await this.stakingService.requireOwner(farmStakeAddress, user.address);
        return this.stakingTransactionService.registerFarmToken(
            farmStakeAddress,
            tokenDisplayName,
            tokenTicker,
            decimals,
        );
    }

    @UseGuards(JwtOrNativeAdminGuard)
    @Query(() => TransactionModel)
    async pauseStaking(
        @Args('farmStakeAddress') farmStakeAddress: string,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        await this.stakingService.requireOwner(farmStakeAddress, user.address);
        return await this.stakingTransactionService.setState(
            farmStakeAddress,
            false,
        );
    }

    @UseGuards(JwtOrNativeAdminGuard)
    @Query(() => TransactionModel)
    async resumeStaking(
        @Args('farmStakeAddress') farmStakeAddress: string,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        await this.stakingService.requireOwner(farmStakeAddress, user.address);
        return this.stakingTransactionService.setState(farmStakeAddress, true);
    }

    @UseGuards(JwtOrNativeAdminGuard)
    @Query(() => TransactionModel)
    async setLocalRolesFarmToken(
        @Args('farmStakeAddress') farmStakeAddress: string,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        await this.stakingService.requireOwner(farmStakeAddress, user.address);
        return this.stakingTransactionService.setLocalRolesFarmToken(
            farmStakeAddress,
        );
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => TransactionModel)
    async unbondFarm(
        @Args() args: GenericStakeFarmArgs,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        return this.stakingTransactionService.unbondFarm(
            user.address,
            args.farmStakeAddress,
            args.payment,
        );
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => TransactionModel)
    async claimStakingRewards(
        @Args() args: GenericStakeFarmArgs,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        return this.stakingTransactionService.claimRewards(
            user.address,
            args.farmStakeAddress,
            args.payment,
        );
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => TransactionModel)
    async claimStakingRewardsWithNewValue(
        @Args() args: ClaimRewardsWithNewValueArgs,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        return this.stakingTransactionService.claimRewardsWithNewValue(
            user.address,
            args.farmStakeAddress,
            args.payment,
            args.newValue,
        );
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => TransactionModel)
    async compoundStakingRewards(
        @Args() args: GenericStakeFarmArgs,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        return this.stakingTransactionService.compoundRewards(
            user.address,
            args.farmStakeAddress,
            args.payment,
        );
    }

    @UseGuards(JwtOrNativeAdminGuard)
    @Query(() => TransactionModel)
    async topUpRewards(
        @Args() args: GenericStakeFarmArgs,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        await this.stakingService.requireOwner(
            args.farmStakeAddress,
            user.address,
        );
        return this.stakingTransactionService.topUpRewards(
            args.farmStakeAddress,
            args.payment,
        );
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => TransactionModel)
    async mergeStakeFarmTokens(
        @Args() args: StakeFarmArgs,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        return this.stakingTransactionService.mergeFarmTokens(
            user.address,
            args.farmStakeAddress,
            args.payments,
        );
    }
}
