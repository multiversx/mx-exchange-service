import { FarmService } from './services/farm.service';
import { Resolver, Query, ResolveField, Parent, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { TransactionModel } from '../../models/transaction.model';
import {
    ExitFarmTokensModel,
    FarmMigrationConfig,
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
import { PairModel } from '../pair/models/pair.model';
import { LockedAssetModel } from '../locked-asset-factory/models/locked-asset.model';
import { GenericResolver } from 'src/services/generics/generic.resolver';
import { EsdtToken } from '../tokens/models/esdtToken.model';
import { NftCollection } from '../tokens/models/nftCollection.model';
import { Address } from '@elrondnetwork/erdjs/out';

@Resolver(() => FarmModel)
export class FarmResolver extends GenericResolver {
    constructor(
        private readonly farmService: FarmService,
        private readonly farmGetterService: FarmGetterService,
        private readonly transactionsService: TransactionsFarmService,
    ) {
        super();
    }

    @ResolveField()
    async farmedToken(@Parent() parent: FarmModel): Promise<EsdtToken> {
        return await this.genericFieldResover(() =>
            this.farmGetterService.getFarmedToken(parent.address),
        );
    }

    @ResolveField()
    async farmToken(@Parent() parent: FarmModel): Promise<NftCollection> {
        return await this.genericFieldResover(() =>
            this.farmGetterService.getFarmToken(parent.address),
        );
    }

    @ResolveField()
    async farmingToken(@Parent() parent: FarmModel): Promise<EsdtToken> {
        return await this.genericFieldResover(() =>
            this.farmGetterService.getFarmingToken(parent.address),
        );
    }

    @ResolveField()
    async produceRewardsEnabled(@Parent() parent: FarmModel): Promise<boolean> {
        return await this.genericFieldResover(() =>
            this.farmGetterService.getProduceRewardsEnabled(parent.address),
        );
    }

    @ResolveField()
    async perBlockRewards(@Parent() parent: FarmModel): Promise<string> {
        return await this.genericFieldResover(() =>
            this.farmGetterService.getRewardsPerBlock(parent.address),
        );
    }

    @ResolveField()
    async farmTokenSupply(@Parent() parent: FarmModel): Promise<string> {
        return await this.genericFieldResover(() =>
            this.farmGetterService.getFarmTokenSupply(parent.address),
        );
    }

    @ResolveField()
    async farmingTokenReserve(@Parent() parent: FarmModel): Promise<string> {
        return await this.genericFieldResover(() =>
            this.farmGetterService.getFarmingTokenReserve(parent.address),
        );
    }

    @ResolveField()
    async farmedTokenPriceUSD(@Parent() parent: FarmModel): Promise<string> {
        return await this.genericFieldResover(() =>
            this.farmGetterService.getFarmedTokenPriceUSD(parent.address),
        );
    }

    @ResolveField()
    async farmTokenPriceUSD(@Parent() parent: FarmModel): Promise<string> {
        return await genericFieldResover(() =>
            this.farmGetterService.getFarmTokenPriceUSD(parent.address),
        );
    }

    @ResolveField()
    async farmingTokenPriceUSD(@Parent() parent: FarmModel): Promise<string> {
        return await this.genericFieldResover(() =>
            this.farmGetterService.getFarmingTokenPriceUSD(parent.address),
        );
    }

    @ResolveField()
    async penaltyPercent(@Parent() parent: FarmModel): Promise<number> {
        return await genericFieldResover(() =>
            this.farmGetterService.getPenaltyPercent(parent.address),
        );
    }

    @ResolveField()
    async minimumFarmingEpochs(@Parent() parent: FarmModel): Promise<number> {
        return await genericFieldResover(() =>
            this.farmGetterService.getMinimumFarmingEpochs(parent.address),
        );
    }

    @ResolveField()
    async rewardPerShare(@Parent() parent: FarmModel): Promise<string> {
        return await this.genericFieldResover(() =>
            this.farmGetterService.getRewardPerShare(parent.address),
        );
    }

    @ResolveField()
    async rewardReserve(@Parent() parent: FarmModel): Promise<string> {
        return await genericFieldResover(() =>
            this.farmGetterService.getRewardReserve(parent.address),
        );
    }

    @ResolveField()
    async lastRewardBlockNonce(@Parent() parent: FarmModel): Promise<number> {
        return await genericFieldResover(() =>
            this.farmGetterService.getLastRewardBlockNonce(parent.address),
        );
    }

    @ResolveField()
    async undistributedFees(@Parent() parent: FarmModel): Promise<string> {
        return await genericFieldResover(() =>
            this.farmGetterService.getUndistributedFees(parent.address),
        );
    }

    @ResolveField()
    async currentBlockFee(@Parent() parent: FarmModel): Promise<string> {
        return await this.genericFieldResover(() =>
            this.farmGetterService.getCurrentBlockFee(parent.address),
        );
    }

    @ResolveField()
    async divisionSafetyConstant(@Parent() parent: FarmModel): Promise<string> {
        return await this.genericFieldResover(() =>
            this.farmGetterService.getDivisionSafetyConstant(parent.address),
        );
    }

    @ResolveField()
    async aprMultiplier(@Parent() parent: FarmModel): Promise<number> {
        return await this.genericFieldResover(() =>
            this.farmGetterService.getLockedRewardAprMuliplier(parent.address),
        );
    }

    @ResolveField()
    async unlockedRewardsAPR(@Parent() parent: FarmModel): Promise<string> {
        return await this.genericFieldResover(() =>
            this.farmGetterService.getUnlockedRewardsAPR(parent.address),
        );
    }

    @ResolveField()
    async lockedRewardsAPR(@Parent() parent: FarmModel): Promise<string> {
        return await this.genericFieldResover(() =>
            this.farmGetterService.getLockedRewardsAPR(parent.address),
        );
    }

    @ResolveField()
    async apr(@Parent() parent: FarmModel): Promise<string> {
        return await this.genericFieldResover(() =>
            this.farmGetterService.getFarmAPR(parent.address),
        );
    }

    @ResolveField()
    async totalValueLockedUSD(parent: FarmModel): Promise<string> {
        return await this.genericFieldResover(() =>
            this.farmGetterService.getTotalValueLockedUSD(parent.address),
        );
    }

    @ResolveField()
    async lockedFarmingTokenReserve(parent: FarmModel): Promise<string> {
        return await this.genericFieldResover(() =>
            this.farmGetterService.getLockedFarmingTokenReserve(parent.address),
        );
    }

    @ResolveField()
    async unlockedFarmingTokenReserve(parent: FarmModel): Promise<string> {
        return await this.genericFieldResover(() =>
            this.farmGetterService.getUnlockedFarmingTokenReserve(
                parent.address,
            ),
        );
    }

    @ResolveField()
    async lockedFarmingTokenReserveUSD(parent: FarmModel): Promise<string> {
        return await this.genericFieldResover(() =>
            this.farmGetterService.getLockedFarmingTokenReserveUSD(
                parent.address,
            ),
        );
    }

    @ResolveField()
    async unlockedFarmingTokenReserveUSD(parent: FarmModel): Promise<string> {
        return await this.genericFieldResover(() =>
            this.farmGetterService.getUnlockedFarmingTokenReserveUSD(
                parent.address,
            ),
        );
    }

    @ResolveField()
    async state(@Parent() parent: FarmModel): Promise<string> {
        return await this.genericFieldResover(() =>
            this.farmGetterService.getState(parent.address),
        );
    }

    @ResolveField()
    async requireWhitelist(@Parent() parent: FarmModel): Promise<boolean> {
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
    async migrationConfig(
        @Parent() parent: FarmModel,
    ): Promise<FarmMigrationConfig> {
        return await this.genericFieldResover(() =>
            this.farmGetterService.getFarmMigrationConfiguration(
                parent.address,
            ),
        );
    }

    @ResolveField()
    async burnGasLimit(@Parent() parent: FarmModel): Promise<string> {
        return await this.genericFieldResover(() =>
            this.farmGetterService.getBurnGasLimit(parent.address),
        );
    }

    @ResolveField()
    async pair(@Parent() parent: FarmModel): Promise<PairModel> {
        try {
            const address =
                await this.farmGetterService.getPairContractManagedAddress(
                    parent.address,
                );
            return Address.fromString(address).equals(Address.Zero())
                ? undefined
                : new PairModel({ address });
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async lockedAssetFactory(
        @Parent() parent: FarmModel,
    ): Promise<LockedAssetModel> {
        try {
            const address =
                await this.farmGetterService.getLockedAssetFactoryManagedAddress(
                    parent.address,
                );
            return new LockedAssetModel({ address });
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async transferExecGasLimit(@Parent() parent: FarmModel): Promise<string> {
        return await this.genericFieldResover(() =>
            this.farmGetterService.getTransferExecGasLimit(parent.address),
        );
    }

    @ResolveField()
    async lastErrorMessage(@Parent() parent: FarmModel): Promise<string> {
        return await this.genericFieldResover(() =>
            this.farmGetterService.getLastErrorMessage(parent.address),
        );
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
        return await this.genericQuery(() =>
            this.farmService.getBatchRewardsForPosition(args.farmsPositions),
        );
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => ExitFarmTokensModel)
    async getExitFarmTokens(
        @Args('args') args: CalculateRewardsArgs,
    ): Promise<ExitFarmTokensModel> {
        return await this.genericQuery(() =>
            this.farmService.getTokensForExitFarm(args),
        );
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => TransactionModel)
    async enterFarm(
        @Args() args: EnterFarmArgs,
        @User() user: any,
    ): Promise<TransactionModel> {
        return await this.genericQuery(() =>
            this.transactionsService.enterFarm(user.publicKey, args),
        );
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => TransactionModel)
    async exitFarm(
        @Args() args: ExitFarmArgs,
        @User() user: any,
    ): Promise<TransactionModel> {
        return await this.genericQuery(() =>
            this.transactionsService.exitFarm(user.publicKey, args),
        );
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => TransactionModel)
    async claimRewards(
        @Args() args: ClaimRewardsArgs,
        @User() user: any,
    ): Promise<TransactionModel> {
        return await this.genericQuery(() =>
            this.transactionsService.claimRewards(user.publicKey, args),
        );
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => TransactionModel)
    async compoundRewards(
        @Args() args: CompoundRewardsArgs,
        @User() user: any,
    ): Promise<TransactionModel> {
        return await this.genericQuery(() =>
            this.transactionsService.compoundRewards(user.publicKey, args),
        );
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => TransactionModel)
    async migrateToNewFarm(
        @Args() args: ExitFarmArgs,
        @User() user: any,
    ): Promise<TransactionModel> {
        return await this.genericQuery(() =>
            this.transactionsService.migrateToNewFarm(user.publicKey, args),
        );
    }

    @UseGuards(GqlAdminGuard)
    @Query(() => TransactionModel)
    async setFarmMigrationConfig(
        @Args() args: FarmMigrationConfigArgs,
        @User() user: any,
    ): Promise<TransactionModel> {
        try {
            await this.farmService.requireOwner(
                args.oldFarmAddress,
                user.publicKey,
            );
            return await this.transactionsService.setFarmMigrationConfig(args);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAdminGuard)
    @Query(() => TransactionModel)
    async stopRewardsAndMigrateRps(
        @Args('farmAddress') farmAddress: string,
        @User() user: any,
    ): Promise<TransactionModel> {
        try {
            await this.farmService.requireOwner(farmAddress, user.publicKey);
            return this.transactionsService.stopRewardsAndMigrateRps(
                farmAddress,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }
}
