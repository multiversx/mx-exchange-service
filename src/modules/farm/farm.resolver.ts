import { FarmService } from './services/farm.service';
import { Resolver, Query, ResolveField, Parent, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { TransactionModel } from '../../models/transaction.model';
import {
    ExitFarmTokensModel,
    BaseFarmModel,
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
import { FarmsUnion } from './models/farm.union';

@Resolver(() => BaseFarmModel)
export class FarmResolver extends GenericResolver {
    constructor(
        protected readonly farmService: FarmService,
        protected readonly farmGetter: FarmGetterService,
        protected readonly transactionsService: TransactionsFarmService,
    ) {
        super();
    }

    @ResolveField()
    async farmedToken(@Parent() parent: BaseFarmModel): Promise<EsdtToken> {
        return await this.genericFieldResover(() =>
            this.farmGetter.getFarmedToken(parent.address),
        );
    }

    @ResolveField()
    async farmToken(@Parent() parent: BaseFarmModel): Promise<NftCollection> {
        return await this.genericFieldResover(() =>
            this.farmGetter.getFarmToken(parent.address),
        );
    }

    @ResolveField()
    async farmingToken(@Parent() parent: BaseFarmModel): Promise<EsdtToken> {
        return await this.genericFieldResover(() =>
            this.farmGetter.getFarmingToken(parent.address),
        );
    }

    @ResolveField()
    async produceRewardsEnabled(
        @Parent() parent: BaseFarmModel,
    ): Promise<boolean> {
        return await this.genericFieldResover(() =>
            this.farmGetter.getProduceRewardsEnabled(parent.address),
        );
    }

    @ResolveField()
    async perBlockRewards(@Parent() parent: BaseFarmModel): Promise<string> {
        return await this.genericFieldResover(() =>
            this.farmGetter.getRewardsPerBlock(parent.address),
        );
    }

    @ResolveField()
    async farmTokenSupply(@Parent() parent: BaseFarmModel): Promise<string> {
        return await this.genericFieldResover(() =>
            this.farmGetter.getFarmTokenSupply(parent.address),
        );
    }

    @ResolveField()
    async farmedTokenPriceUSD(
        @Parent() parent: BaseFarmModel,
    ): Promise<string> {
        return await this.genericFieldResover(() =>
            this.farmGetter.getFarmedTokenPriceUSD(parent.address),
        );
    }

    @ResolveField()
    async farmTokenPriceUSD(@Parent() parent: BaseFarmModel): Promise<string> {
        return await this.genericFieldResover(() =>
            this.farmGetter.getFarmTokenPriceUSD(parent.address),
        );
    }

    @ResolveField()
    async farmingTokenPriceUSD(
        @Parent() parent: BaseFarmModel,
    ): Promise<string> {
        return await this.genericFieldResover(() =>
            this.farmGetter.getFarmingTokenPriceUSD(parent.address),
        );
    }

    @ResolveField()
    async penaltyPercent(@Parent() parent: BaseFarmModel): Promise<number> {
        return await this.genericFieldResover(() =>
            this.farmGetter.getPenaltyPercent(parent.address),
        );
    }

    @ResolveField()
    async minimumFarmingEpochs(
        @Parent() parent: BaseFarmModel,
    ): Promise<number> {
        return await this.genericFieldResover(() =>
            this.farmGetter.getMinimumFarmingEpochs(parent.address),
        );
    }

    @ResolveField()
    async rewardPerShare(@Parent() parent: BaseFarmModel): Promise<string> {
        return await this.genericFieldResover(() =>
            this.farmGetter.getRewardPerShare(parent.address),
        );
    }

    @ResolveField()
    async rewardReserve(@Parent() parent: BaseFarmModel): Promise<string> {
        return await this.genericFieldResover(() =>
            this.farmGetter.getRewardReserve(parent.address),
        );
    }

    @ResolveField()
    async lastRewardBlockNonce(
        @Parent() parent: BaseFarmModel,
    ): Promise<number> {
        return await this.genericFieldResover(() =>
            this.farmGetter.getLastRewardBlockNonce(parent.address),
        );
    }

    @ResolveField()
    async divisionSafetyConstant(
        @Parent() parent: BaseFarmModel,
    ): Promise<string> {
        return await this.genericFieldResover(() =>
            this.farmGetter.getDivisionSafetyConstant(parent.address),
        );
    }

    @ResolveField()
    async totalValueLockedUSD(parent: BaseFarmModel): Promise<string> {
        return await this.genericFieldResover(() =>
            this.farmGetter.getTotalValueLockedUSD(parent.address),
        );
    }

    @ResolveField()
    async state(@Parent() parent: BaseFarmModel): Promise<string> {
        return await this.genericFieldResover(() =>
            this.farmGetter.getState(parent.address),
        );
    }

    @ResolveField()
    async burnGasLimit(@Parent() parent: BaseFarmModel): Promise<string> {
        return await this.genericFieldResover(() =>
            this.farmGetter.getBurnGasLimit(parent.address),
        );
    }

    @ResolveField()
    async pair(@Parent() parent: BaseFarmModel): Promise<PairModel> {
        try {
            const address = await this.farmGetter.getPairContractManagedAddress(
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
        @Parent() parent: BaseFarmModel,
    ): Promise<LockedAssetModel> {
        try {
            const address =
                await this.farmGetter.getLockedAssetFactoryManagedAddress(
                    parent.address,
                );
            return new LockedAssetModel({ address });
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async transferExecGasLimit(
        @Parent() parent: BaseFarmModel,
    ): Promise<string> {
        return await this.genericFieldResover(() =>
            this.farmGetter.getTransferExecGasLimit(parent.address),
        );
    }

    @ResolveField()
    async lastErrorMessage(@Parent() parent: BaseFarmModel): Promise<string> {
        return await this.genericFieldResover(() =>
            this.farmGetter.getLastErrorMessage(parent.address),
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

    @Query(() => [FarmsUnion])
    async farms(): Promise<Array<typeof FarmsUnion>> {
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
