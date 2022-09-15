import { FarmService } from './services/farm.service';
import { Resolver, Query, ResolveField, Parent, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { TransactionModel } from '../../models/transaction.model';
import {
    ExitFarmTokensModel,
    FarmModel,
    RewardsModel,
} from './models/farm.model';
import { TransactionsFarmService } from './services/transactions-farm.service';
import {
    BatchFarmRewardsComputeArgs,
    CalculateRewardsArgs,
    ClaimRewardsArgs,
    CompoundRewardsArgs,
    EnterFarmArgs,
    ExitFarmArgs,
    FarmMigrationConfigArgs,
    MergeFarmTokensArgs,
} from './models/farm.args';
import { ApolloError } from 'apollo-server-express';
import { FarmTokenAttributesModel } from './models/farmTokenAttributes.model';
import { FarmGetterService } from './services/farm.getter.service';
import { GqlAuthGuard } from '../auth/gql.auth.guard';
import { User } from 'src/helpers/userDecorator';
import { GqlAdminGuard } from '../auth/gql.admin.guard';

@Resolver(() => FarmModel)
export class FarmResolver {
    constructor(
        private readonly farmService: FarmService,
        private readonly farmGetterService: FarmGetterService,
        private readonly transactionsService: TransactionsFarmService,
    ) {}

    @ResolveField()
    async farmedToken(@Parent() parent: FarmModel) {
        try {
            return await this.farmGetterService.getFarmedToken(parent.address);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async farmToken(@Parent() parent: FarmModel) {
        try {
            return await this.farmGetterService.getFarmToken(parent.address);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async farmingToken(@Parent() parent: FarmModel) {
        try {
            return await this.farmGetterService.getFarmingToken(parent.address);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async produceRewardsEnabled(@Parent() parent: FarmModel) {
        try {
            return await this.farmGetterService.getProduceRewardsEnabled(
                parent.address,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async perBlockRewards(@Parent() parent: FarmModel) {
        try {
            return await this.farmGetterService.getRewardsPerBlock(
                parent.address,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async farmTokenSupply(@Parent() parent: FarmModel) {
        try {
            return await this.farmGetterService.getFarmTokenSupply(
                parent.address,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async farmingTokenReserve(@Parent() parent: FarmModel) {
        try {
            return await this.farmGetterService.getFarmingTokenReserve(
                parent.address,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async farmedTokenPriceUSD(@Parent() parent: FarmModel) {
        try {
            return await this.farmGetterService.getFarmedTokenPriceUSD(
                parent.address,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async farmTokenPriceUSD(@Parent() parent: FarmModel) {
        try {
            return await this.farmGetterService.getFarmTokenPriceUSD(
                parent.address,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async farmingTokenPriceUSD(@Parent() parent: FarmModel) {
        try {
            return await this.farmGetterService.getFarmingTokenPriceUSD(
                parent.address,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async penaltyPercent(@Parent() parent: FarmModel) {
        try {
            return await this.farmGetterService.getPenaltyPercent(
                parent.address,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async minimumFarmingEpochs(@Parent() parent: FarmModel) {
        try {
            return await this.farmGetterService.getMinimumFarmingEpochs(
                parent.address,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async rewardPerShare(@Parent() parent: FarmModel) {
        try {
            return await this.farmGetterService.getRewardPerShare(
                parent.address,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async rewardReserve(@Parent() parent: FarmModel) {
        try {
            return await this.farmGetterService.getRewardReserve(
                parent.address,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async lastRewardBlockNonce(@Parent() parent: FarmModel) {
        try {
            return await this.farmGetterService.getLastRewardBlockNonce(
                parent.address,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async undistributedFees(@Parent() parent: FarmModel) {
        try {
            return await this.farmGetterService.getUndistributedFees(
                parent.address,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async currentBlockFee(@Parent() parent: FarmModel) {
        try {
            return await this.farmGetterService.getCurrentBlockFee(
                parent.address,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async divisionSafetyConstant(@Parent() parent: FarmModel) {
        try {
            return await this.farmGetterService.getDivisionSafetyConstant(
                parent.address,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async aprMultiplier(@Parent() parent: FarmModel) {
        try {
            return await this.farmGetterService.getLockedRewardAprMuliplier(
                parent.address,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async unlockedRewardsAPR(@Parent() parent: FarmModel) {
        try {
            return await this.farmGetterService.getUnlockedRewardsAPR(
                parent.address,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async lockedRewardsAPR(@Parent() parent: FarmModel) {
        try {
            return await this.farmGetterService.getLockedRewardsAPR(
                parent.address,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async apr(@Parent() parent: FarmModel) {
        try {
            return await this.farmGetterService.getFarmAPR(parent.address);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async totalValueLockedUSD(parent: FarmModel) {
        try {
            return await this.farmGetterService.getTotalValueLockedUSD(
                parent.address,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async lockedFarmingTokenReserve(parent: FarmModel) {
        try {
            return await this.farmGetterService.getLockedFarmingTokenReserve(
                parent.address,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async unlockedFarmingTokenReserve(parent: FarmModel) {
        try {
            return await this.farmGetterService.getUnlockedFarmingTokenReserve(
                parent.address,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async lockedFarmingTokenReserveUSD(parent: FarmModel) {
        try {
            return await this.farmGetterService.getLockedFarmingTokenReserveUSD(
                parent.address,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async unlockedFarmingTokenReserveUSD(parent: FarmModel) {
        try {
            return await this.farmGetterService.getUnlockedFarmingTokenReserveUSD(
                parent.address,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async state(@Parent() parent: FarmModel) {
        try {
            return await this.farmGetterService.getState(parent.address);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async requireWhitelist(@Parent() parent: FarmModel) {
        try {
            const whitelists = await this.farmGetterService.getWhitelist(
                parent.address,
            );
            return whitelists ? whitelists.length > 0 : false;
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async migrationConfig(@Parent() parent: FarmModel) {
        try {
            return await this.farmGetterService.getFarmMigrationConfiguration(
                parent.address,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async burnGasLimit(@Parent() parent: FarmModel) {
        try {
            return await this.farmGetterService.getBurnGasLimit(parent.address);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async pairContractManagedAddress(@Parent() parent: FarmModel) {
        try {
            return await this.farmGetterService.getPairContractManagedAddress(
                parent.address,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async lockedAssetFactoryManagedAddress(@Parent() parent: FarmModel) {
        try {
            return await this.farmGetterService.getLockedAssetFactoryManagedAddress(
                parent.address,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async transferExecGasLimit(@Parent() parent: FarmModel) {
        try {
            return await this.farmGetterService.getTransferExecGasLimit(
                parent.address,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async lastErrorMessage(@Parent() parent: FarmModel) {
        try {
            return await this.farmGetterService.getLastErrorMessage(
                parent.address,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => FarmTokenAttributesModel)
    async farmTokenAttributes(
        @Args('farmAddress') farmAddress: string,
        @Args('identifier') identifier: string,
        @Args('attributes') attributes: string,
    ): Promise<FarmTokenAttributesModel> {
        return this.farmService.decodeFarmTokenAttributes(
            farmAddress,
            identifier,
            attributes,
        );
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => TransactionModel)
    async mergeFarmTokens(
        @Args() args: MergeFarmTokensArgs,
        @User() user: any,
    ): Promise<TransactionModel> {
        return await this.transactionsService.mergeFarmTokens(
            user.publicKey,
            args.farmAddress,
            args.payments,
        );
    }

    @UseGuards(GqlAdminGuard)
    @Query(() => TransactionModel)
    async endProduceRewards(
        @Args('farmAddress') farmAddress: string,
        @User() user: any,
    ): Promise<TransactionModel> {
        try {
            await this.farmService.requireOwner(farmAddress, user.publicKey);
            return await this.transactionsService.endProduceRewards(
                farmAddress,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAdminGuard)
    @Query(() => TransactionModel)
    async setPerBlockRewardAmount(
        @Args('farmAddress') farmAddress: string,
        @Args('amount') amount: string,
        @User() user: any,
    ): Promise<TransactionModel> {
        try {
            await this.farmService.requireOwner(farmAddress, user.publicKey);
            return await this.transactionsService.setPerBlockRewardAmount(
                farmAddress,
                amount,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAdminGuard)
    @Query(() => TransactionModel)
    async startProduceRewards(
        @Args('farmAddress') farmAddress: string,
        @User() user: any,
    ): Promise<TransactionModel> {
        try {
            await this.farmService.requireOwner(farmAddress, user.publicKey);
            return await this.transactionsService.startProduceRewards(
                farmAddress,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAdminGuard)
    @Query(() => TransactionModel)
    async setPenaltyPercent(
        @Args('farmAddress') farmAddress: string,
        @Args('percent') percent: number,
        @User() user: any,
    ): Promise<TransactionModel> {
        try {
            await this.farmService.requireOwner(farmAddress, user.publicKey);
            return await this.transactionsService.setPenaltyPercent(
                farmAddress,
                percent,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAdminGuard)
    @Query(() => TransactionModel)
    async setMinimumFarmingEpochs(
        @Args('farmAddress') farmAddress: string,
        @Args('epochs') epochs: number,
        @User() user: any,
    ): Promise<TransactionModel> {
        try {
            await this.farmService.requireOwner(farmAddress, user.publicKey);
            return await this.transactionsService.setMinimumFarmingEpochs(
                farmAddress,
                epochs,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAdminGuard)
    @Query(() => TransactionModel)
    async setTransferExecGasLimit(
        @Args('farmAddress') farmAddress: string,
        @Args('gasLimit') gasLimit: number,
        @User() user: any,
    ): Promise<TransactionModel> {
        try {
            await this.farmService.requireOwner(farmAddress, user.publicKey);
            return await this.transactionsService.setTransferExecGasLimit(
                farmAddress,
                gasLimit,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAdminGuard)
    @Query(() => TransactionModel)
    async setBurnGasLimit(
        @Args('farmAddress') farmAddress: string,
        @Args('gasLimit') gasLimit: number,
        @User() user: any,
    ): Promise<TransactionModel> {
        try {
            await this.farmService.requireOwner(farmAddress, user.publicKey);
            return await this.transactionsService.setBurnGasLimit(
                farmAddress,
                gasLimit,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAdminGuard)
    @Query(() => TransactionModel)
    async pause(
        @Args('farmAddress') farmAddress: string,
        @User() user: any,
    ): Promise<TransactionModel> {
        try {
            await this.farmService.requireOwner(farmAddress, user.publicKey);
            return await this.transactionsService.pause(farmAddress);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAdminGuard)
    @Query(() => TransactionModel)
    async resume(
        @Args('farmAddress') farmAddress: string,
        @User() user: any,
    ): Promise<TransactionModel> {
        try {
            await this.farmService.requireOwner(farmAddress, user.publicKey);
            return await this.transactionsService.resume(farmAddress);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAdminGuard)
    @Query(() => TransactionModel)
    async registerFarmToken(
        @Args('farmAddress') farmAddress: string,
        @Args('tokenDisplayName') tokenDisplayName: string,
        @Args('tokenTicker') tokenTicker: string,
        @Args('decimals') decimals: number,
        @User() user: any,
    ): Promise<TransactionModel> {
        try {
            await this.farmService.requireOwner(farmAddress, user.publicKey);
            return await this.transactionsService.registerFarmToken(
                farmAddress,
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
    async setLocalRolesFarmToken(
        @Args('farmAddress') farmAddress: string,
        @User() user: any,
    ): Promise<TransactionModel> {
        try {
            await this.farmService.requireOwner(farmAddress, user.publicKey);
            return await this.transactionsService.setLocalRolesFarmToken(
                farmAddress,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @Query(() => [FarmModel])
    async farms(): Promise<FarmModel[]> {
        return this.farmService.getFarms();
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => [RewardsModel])
    async getRewardsForPosition(
        @Args('farmsPositions') args: BatchFarmRewardsComputeArgs,
    ): Promise<RewardsModel[]> {
        try {
            return await this.farmService.getBatchRewardsForPosition(
                args.farmsPositions,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => ExitFarmTokensModel)
    async getExitFarmTokens(
        @Args('args') args: CalculateRewardsArgs,
    ): Promise<ExitFarmTokensModel> {
        return this.farmService.getTokensForExitFarm(args);
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => TransactionModel)
    async enterFarm(
        @Args() args: EnterFarmArgs,
        @User() user: any,
    ): Promise<TransactionModel> {
        try {
            return await this.transactionsService.enterFarm(
                user.publicKey,
                args,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => TransactionModel)
    async exitFarm(
        @Args() args: ExitFarmArgs,
        @User() user: any,
    ): Promise<TransactionModel> {
        return await this.transactionsService.exitFarm(user.publicKey, args);
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => TransactionModel)
    async claimRewards(
        @Args() args: ClaimRewardsArgs,
        @User() user: any,
    ): Promise<TransactionModel> {
        return await this.transactionsService.claimRewards(
            user.publicKey,
            args,
        );
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => TransactionModel)
    async compoundRewards(
        @Args() args: CompoundRewardsArgs,
        @User() user: any,
    ): Promise<TransactionModel> {
        return await this.transactionsService.compoundRewards(
            user.publicKey,
            args,
        );
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => TransactionModel)
    async migrateToNewFarm(
        @Args() args: ExitFarmArgs,
        @User() user: any,
    ): Promise<TransactionModel> {
        return await this.transactionsService.migrateToNewFarm(
            user.publicKey,
            args,
        );
    }

    @UseGuards(GqlAdminGuard)
    @Query(() => TransactionModel)
    async setFarmMigrationConfig(
        @Args() args: FarmMigrationConfigArgs,
    ): Promise<TransactionModel> {
        return await this.transactionsService.setFarmMigrationConfig(args);
    }

    @UseGuards(GqlAdminGuard)
    @Query(() => TransactionModel)
    async stopRewardsAndMigrateRps(
        @Args('farmAddress') farmAddress: string,
    ): Promise<TransactionModel> {
        return await this.transactionsService.stopRewardsAndMigrateRps(
            farmAddress,
        );
    }
}
