import { UseGuards } from '@nestjs/common';
import { Args, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
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
    StakingFarmsFilter,
    StakingFarmsSortingArgs,
} from './models/staking.args';
import {
    OptimalCompoundModel,
    StakingBoostedRewardsModel,
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
import { GlobalInfoByWeekModel } from 'src/submodules/weekly-rewards-splitting/models/weekly-rewards-splitting.model';
import { constantsConfig } from 'src/config';
import { WeeklyRewardsSplittingAbiService } from 'src/submodules/weekly-rewards-splitting/services/weekly-rewards-splitting.abi.service';
import { StakeAddressValidationPipe } from './validators/stake.address.validator';
import { BoostedYieldsFactors } from '../farm/models/farm.v2.model';
import { UserTotalBoostedPosition } from '../farm/models/farm.model';
import { StakingFarmsResponse } from './models/staking.farms.response';
import ConnectionArgs, {
    getPagingParameters,
} from '../common/filters/connection.args';
import PageResponse from '../common/page.response';

@Resolver(() => StakingBoostedRewardsModel)
export class StakingBoostedRewardsResolver {
    constructor(private readonly stakingCompute: StakingComputeService) {}

    @ResolveField()
    async curentBoostedAPR(
        @Parent() parent: StakingBoostedRewardsModel,
        @Args('additionalUserFarmAmount', {
            type: () => String,
            nullable: true,
            defaultValue: '0',
        })
        additionalUserFarmAmount: string,
        @Args('additionalUserEnergy', {
            type: () => String,
            nullable: true,
            defaultValue: '0',
        })
        additionalUserEnergy: string,
    ): Promise<number> {
        return this.stakingCompute.computeUserCurentBoostedAPR(
            parent.farmAddress,
            parent.userAddress,
            additionalUserFarmAmount,
            additionalUserEnergy,
        );
    }

    @ResolveField()
    async maximumBoostedAPR(
        @Parent() parent: StakingBoostedRewardsModel,
        @Args('additionalUserFarmAmount', {
            type: () => String,
            nullable: true,
            defaultValue: '0',
        })
        additionalUserFarmAmount: string,
    ): Promise<number> {
        return this.stakingCompute.computeUserMaxBoostedAPR(
            parent.farmAddress,
            parent.userAddress,
            additionalUserFarmAmount,
        );
    }
}

@Resolver(() => StakingModel)
export class StakingResolver {
    constructor(
        private readonly stakingService: StakingService,
        private readonly stakingAbi: StakingAbiService,
        private readonly stakingCompute: StakingComputeService,
        private readonly stakingTransactionService: StakingTransactionService,
        private readonly weekTimekeepingAbi: WeekTimekeepingAbiService,
        private readonly weeklyRewardsSplittingAbi: WeeklyRewardsSplittingAbiService,
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
    async aprUncapped(@Parent() parent: StakingModel) {
        return this.stakingCompute.stakeFarmUncappedAPR(parent.address);
    }

    @ResolveField()
    async boostedApr(@Parent() parent: StakingModel) {
        return this.stakingCompute.boostedAPR(parent.address);
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
    async rewardsRemainingDays(@Parent() parent: StakingModel) {
        return this.stakingCompute.computeRewardsRemainingDays(parent.address);
    }

    @ResolveField()
    async rewardsRemainingDaysUncapped(@Parent() parent: StakingModel) {
        return this.stakingCompute.computeRewardsRemainingDaysUncapped(
            parent.address,
        );
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

    @ResolveField()
    async boosterRewards(
        @Parent() parent: StakingModel,
    ): Promise<GlobalInfoByWeekModel[]> {
        const modelsList = [];
        const currentWeek = await this.weekTimekeepingAbi.currentWeek(
            parent.address,
        );
        for (
            let week = currentWeek - constantsConfig.USER_MAX_CLAIM_WEEKS;
            week <= currentWeek;
            week++
        ) {
            if (week < 1) {
                continue;
            }
            modelsList.push(
                new GlobalInfoByWeekModel({
                    scAddress: parent.address,
                    week: week,
                }),
            );
        }
        return modelsList;
    }

    @ResolveField()
    async lastGlobalUpdateWeek(
        @Parent() parent: StakingModel,
    ): Promise<number> {
        return this.weeklyRewardsSplittingAbi.lastGlobalUpdateWeek(
            parent.address,
        );
    }

    @ResolveField()
    async farmTokenSupplyCurrentWeek(
        @Parent() parent: StakingModel,
    ): Promise<string> {
        const week = await this.weekTimekeepingAbi.currentWeek(parent.address);
        return this.stakingAbi.farmSupplyForWeek(parent.address, week);
    }

    @ResolveField()
    async energyFactoryAddress(
        @Parent() parent: StakingModel,
    ): Promise<string> {
        return this.stakingAbi.energyFactoryAddress(parent.address);
    }

    @ResolveField()
    async boostedYieldsRewardsPercenatage(
        @Parent() parent: StakingModel,
    ): Promise<number> {
        return this.stakingAbi.boostedYieldsRewardsPercenatage(parent.address);
    }

    @ResolveField()
    async boostedYieldsFactors(
        @Parent() parent: StakingModel,
    ): Promise<BoostedYieldsFactors> {
        return this.stakingAbi.boostedYieldsFactors(parent.address);
    }

    @ResolveField()
    async optimalEnergyPerStaking(
        @Parent() parent: StakingModel,
    ): Promise<string> {
        const currentWeek = await this.weekTimekeepingAbi.currentWeek(
            parent.address,
        );
        return this.stakingCompute.optimalEnergyPerStaking(
            parent.address,
            currentWeek,
        );
    }

    @ResolveField()
    async accumulatedRewardsForWeek(
        @Parent() parent: StakingModel,
        @Args('week', { nullable: true }) week: number,
    ): Promise<string> {
        const currentWeek = await this.weekTimekeepingAbi.currentWeek(
            parent.address,
        );
        return this.stakingAbi.accumulatedRewardsForWeek(
            parent.address,
            week ?? currentWeek,
        );
    }

    @ResolveField()
    async undistributedBoostedRewards(
        @Parent() parent: StakingModel,
    ): Promise<string> {
        const currentWeek = await this.weekTimekeepingAbi.currentWeek(
            parent.address,
        );
        return this.stakingCompute.undistributedBoostedRewards(
            parent.address,
            currentWeek,
        );
    }

    @ResolveField()
    async undistributedBoostedRewardsClaimed(
        @Parent() parent: StakingModel,
    ): Promise<string> {
        return this.stakingAbi.undistributedBoostedRewards(parent.address);
    }

    @ResolveField()
    async stakingPositionMigrationNonce(
        @Parent() parent: StakingModel,
    ): Promise<number> {
        return this.stakingAbi.farmPositionMigrationNonce(parent.address);
    }

    @ResolveField()
    async deployedAt(@Parent() parent: StakingModel) {
        return this.stakingCompute.deployedAt(parent.address);
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
        @Args('computeBoosted', { nullable: true }) computeBoosted: boolean,
    ): Promise<StakingRewardsModel[]> {
        return this.stakingService.getBatchRewardsForPosition(
            args.farmsPositions,
            computeBoosted,
        );
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => [StakingBoostedRewardsModel], {
        description: 'Returns staking boosted rewards for the user',
    })
    async getStakingBoostedRewardsBatch(
        @Args('stakingAddresses', { type: () => [String] })
        stakingAddresses: string[],
        @AuthUser() user: UserAuthResult,
    ): Promise<StakingBoostedRewardsModel[]> {
        return this.stakingService.getStakingBoostedRewardsBatch(
            stakingAddresses,
            user.address,
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

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => [UserTotalBoostedPosition], {
        description:
            'Returns the total staked position of the user in the staking contract',
    })
    async userTotalStakePosition(
        @Args(
            'stakeAddresses',
            { type: () => [String] },
            StakeAddressValidationPipe,
        )
        stakeAddresses: string[],
        @AuthUser() user: UserAuthResult,
    ): Promise<UserTotalBoostedPosition[]> {
        const positions = await Promise.all(
            stakeAddresses.map((stakeAddress) =>
                this.stakingAbi.userTotalStakePosition(
                    stakeAddress,
                    user.address,
                ),
            ),
        );

        return stakeAddresses.map((stakeAddress, index) => {
            return new UserTotalBoostedPosition({
                address: stakeAddress,
                boostedTokensAmount: positions[index],
            });
        });
    }

    @Query(() => [StakingModel])
    async stakingFarms(): Promise<StakingModel[]> {
        return this.stakingService.getFarmsStaking();
    }

    @Query(() => StakingFarmsResponse)
    async filteredStakingFarms(
        @Args({
            name: 'filters',
            type: () => StakingFarmsFilter,
            nullable: true,
        })
        filters: StakingFarmsFilter,
        @Args({
            name: 'pagination',
            type: () => ConnectionArgs,
            nullable: true,
        })
        pagination: ConnectionArgs,
        @Args({
            name: 'sorting',
            type: () => StakingFarmsSortingArgs,
            nullable: true,
        })
        sorting: StakingFarmsSortingArgs,
    ): Promise<StakingFarmsResponse> {
        const pagingParams = getPagingParameters(pagination);

        const response = await this.stakingService.getFilteredFarmsStaking(
            pagingParams,
            filters,
            sorting,
        );

        return PageResponse.mapResponse<StakingModel>(
            response?.items || [],
            pagination ?? new ConnectionArgs(),
            response?.count || 0,
            pagingParams.offset,
            pagingParams.limit,
        );
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

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => [TransactionModel])
    async migrateTotalStakingPosition(
        @Args('stakeAddresses', { type: () => [String] })
        stakeAddresses: string[],
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel[]> {
        const promises = stakeAddresses.map((stakeAddress) =>
            this.stakingTransactionService.migrateTotalStakingPosition(
                stakeAddress,
                user.address,
            ),
        );
        return (await Promise.all(promises)).flat();
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

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => TransactionModel)
    async claimStakingBoostedRewards(
        @Args('stakeAddress') stakeAddress: string,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        return this.stakingTransactionService.claimBoostedRewards(
            user.address,
            stakeAddress,
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
