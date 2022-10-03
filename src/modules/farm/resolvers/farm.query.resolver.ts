import { UseGuards } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { ApolloError } from 'apollo-server-express';
import { User } from 'src/helpers/userDecorator';
import { TransactionModel } from 'src/models/transaction.model';
import { GqlAdminGuard } from 'src/modules/auth/gql.admin.guard';
import { GqlAuthGuard } from 'src/modules/auth/gql.auth.guard';
import { GenericResolver } from 'src/services/generics/generic.resolver';
import {
    BatchFarmRewardsComputeArgs,
    CalculateRewardsArgs,
    ClaimRewardsArgs,
    CompoundRewardsArgs,
    EnterFarmArgs,
    ExitFarmArgs,
    FarmMigrationConfigArgs,
    MergeFarmTokensArgs,
} from '../models/farm.args';
import { ExitFarmTokensModel, RewardsModel } from '../models/farm.model';
import { FarmsUnion } from '../models/farm.union';
import { FarmTokenAttributesModel } from '../models/farmTokenAttributes.model';
import { FarmService } from '../services/farm.service';
import { TransactionsFarmService } from '../services/transactions-farm.service';

@Resolver()
export class FarmQueryResolver extends GenericResolver {
    constructor(
        private readonly farmService: FarmService,
        private readonly transactionsService: TransactionsFarmService,
    ) {
        super();
    }

    @Query(() => [FarmsUnion])
    async farms(): Promise<Array<typeof FarmsUnion>> {
        return this.farmService.getFarms();
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
