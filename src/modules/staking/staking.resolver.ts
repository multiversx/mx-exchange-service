import { UseGuards, UsePipes } from '@nestjs/common';
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
import { StakeAddressValidationPipe } from './validators/stake.address.validator';
import { UserTotalBoostedPosition } from '../farm/models/farm.model';
import { StakingFarmsResponse } from './models/staking.farms.response';
import ConnectionArgs, {
    getPagingParameters,
} from '../common/filters/connection.args';
import PageResponse from '../common/page.response';
import { QueryArgsValidationPipe } from 'src/helpers/validators/query.args.validation.pipe';
import { relayQueryEstimator } from 'src/helpers/complexity/query.estimators';
import { StateDataLoader } from '../state/services/state.dataloader';

@Resolver(() => StakingBoostedRewardsModel)
export class StakingBoostedRewardsResolver {
    constructor(private readonly stakingCompute: StakingComputeService) {}

    @ResolveField()
    async estimatedWeeklyRewards(
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
    ): Promise<string> {
        return this.stakingCompute.computeUserEstimatedWeeklyRewards(
            parent.farmAddress,
            parent.userAddress,
            additionalUserFarmAmount,
            additionalUserEnergy,
        );
    }

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
        private readonly stateDataLoader: StateDataLoader,
    ) {}

    @ResolveField()
    async farmToken(parent: StakingModel) {
        return this.stateDataLoader.loadNft(parent.farmTokenCollection);
    }

    @ResolveField()
    async farmingToken(parent: StakingModel) {
        return this.stateDataLoader.loadToken(parent.farmingTokenId);
    }

    @ResolveField()
    async rewardToken(parent: StakingModel) {
        return this.stateDataLoader.loadToken(parent.rewardTokenId);
    }

    @ResolveField()
    async accumulatedRewardsForWeek(
        @Parent() parent: StakingModel,
        @Args('week', { nullable: true }) week: number,
    ): Promise<string> {
        if (!week || week === parent.time.currentWeek) {
            return parent.accumulatedRewardsForWeek;
        }

        return this.stakingAbi.accumulatedRewardsForWeek(parent.address, week);
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

    @Query(() => StakingFarmsResponse, {
        complexity: relayQueryEstimator,
    })
    @UsePipes(new QueryArgsValidationPipe())
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
            user.address,
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
            user.address,
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
            user.address,
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
            user.address,
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
            user.address,
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
            user.address,
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
            user.address,
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
            user.address,
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
        return this.stakingTransactionService.setState(
            user.address,
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
        return this.stakingTransactionService.setState(
            user.address,
            farmStakeAddress,
            true,
        );
    }

    @UseGuards(JwtOrNativeAdminGuard)
    @Query(() => TransactionModel)
    async setLocalRolesFarmToken(
        @Args('farmStakeAddress') farmStakeAddress: string,
        @Args('address') address: string,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        await this.stakingService.requireOwner(farmStakeAddress, user.address);
        return this.stakingTransactionService.setLocalRolesFarmToken(
            user.address,
            farmStakeAddress,
            address,
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
            user.address,
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
