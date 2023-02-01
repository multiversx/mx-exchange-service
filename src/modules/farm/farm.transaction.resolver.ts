import { UseGuards } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { ApolloError } from 'apollo-server-express';
import { AuthUser } from '../auth/auth.user';
import { UserAuthResult } from '../auth/user.auth.result';
import { TransactionModel } from 'src/models/transaction.model';
import { GqlAdminGuard } from 'src/modules/auth/gql.admin.guard';
import { JwtOrNativeAuthGuard } from '../auth/jwt.or.native.auth.guard';
import { GenericResolver } from 'src/services/generics/generic.resolver';
import {
    ClaimRewardsArgs,
    CompoundRewardsArgs,
    EnterFarmArgs,
    ExitFarmArgs,
    FarmMigrationConfigArgs,
    MergeFarmTokensArgs,
} from './models/farm.args';
import { FarmFactoryService } from './farm.factory';
import { FarmTransactionServiceV1_2 } from './v1.2/services/farm.v1.2.transaction.service';
import { farmVersion } from 'src/utils/farm.utils';
import { FarmVersion } from './models/farm.model';
import { FarmTransactionFactory } from './farm.transaction.factory';

@Resolver()
export class FarmTransactionResolver extends GenericResolver {
    constructor(
        private readonly farmFactory: FarmFactoryService,
        private readonly transactionFactory: FarmTransactionFactory,
        private readonly farmTransactionV1_2: FarmTransactionServiceV1_2,
    ) {
        super();
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => TransactionModel)
    async mergeFarmTokens(
        @Args() args: MergeFarmTokensArgs,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        return await this.transactionFactory
            .useTransaction(args.farmAddress)
            .mergeFarmTokens(user.address, args.farmAddress, args.payments);
    }

    @UseGuards(GqlAdminGuard)
    @Query(() => TransactionModel)
    async endProduceRewards(
        @Args('farmAddress') farmAddress: string,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        try {
            await this.farmFactory
                .useService(farmAddress)
                .requireOwner(farmAddress, user.address);
            return await this.transactionFactory
                .useTransaction(farmAddress)
                .endProduceRewards(farmAddress);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAdminGuard)
    @Query(() => TransactionModel)
    async setPerBlockRewardAmount(
        @Args('farmAddress') farmAddress: string,
        @Args('amount') amount: string,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        try {
            await this.farmFactory
                .useService(farmAddress)
                .requireOwner(farmAddress, user.address);
            return await this.transactionFactory
                .useTransaction(farmAddress)
                .setPerBlockRewardAmount(farmAddress, amount);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAdminGuard)
    @Query(() => TransactionModel)
    async startProduceRewards(
        @Args('farmAddress') farmAddress: string,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        try {
            await this.farmFactory
                .useService(farmAddress)
                .requireOwner(farmAddress, user.address);
            return await this.transactionFactory
                .useTransaction(farmAddress)
                .startProduceRewards(farmAddress);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAdminGuard)
    @Query(() => TransactionModel)
    async setPenaltyPercent(
        @Args('farmAddress') farmAddress: string,
        @Args('percent') percent: number,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        try {
            await this.farmFactory
                .useService(farmAddress)
                .requireOwner(farmAddress, user.address);
            return await this.transactionFactory
                .useTransaction(farmAddress)
                .setPenaltyPercent(farmAddress, percent);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAdminGuard)
    @Query(() => TransactionModel)
    async setMinimumFarmingEpochs(
        @Args('farmAddress') farmAddress: string,
        @Args('epochs') epochs: number,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        try {
            await this.farmFactory
                .useService(farmAddress)
                .requireOwner(farmAddress, user.address);
            return await this.transactionFactory
                .useTransaction(farmAddress)
                .setMinimumFarmingEpochs(farmAddress, epochs);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAdminGuard)
    @Query(() => TransactionModel)
    async setTransferExecGasLimit(
        @Args('farmAddress') farmAddress: string,
        @Args('gasLimit') gasLimit: number,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        try {
            await this.farmFactory
                .useService(farmAddress)
                .requireOwner(farmAddress, user.address);
            return await this.transactionFactory
                .useTransaction(farmAddress)
                .setTransferExecGasLimit(farmAddress, gasLimit);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAdminGuard)
    @Query(() => TransactionModel)
    async setBurnGasLimit(
        @Args('farmAddress') farmAddress: string,
        @Args('gasLimit') gasLimit: number,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        try {
            await this.farmFactory
                .useService(farmAddress)
                .requireOwner(farmAddress, user.address);
            return await this.transactionFactory
                .useTransaction(farmAddress)
                .setBurnGasLimit(farmAddress, gasLimit);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAdminGuard)
    @Query(() => TransactionModel)
    async pause(
        @Args('farmAddress') farmAddress: string,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        try {
            await this.farmFactory
                .useService(farmAddress)
                .requireOwner(farmAddress, user.address);
            return await this.transactionFactory
                .useTransaction(farmAddress)
                .pause(farmAddress);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAdminGuard)
    @Query(() => TransactionModel)
    async resume(
        @Args('farmAddress') farmAddress: string,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        try {
            await this.farmFactory
                .useService(farmAddress)
                .requireOwner(farmAddress, user.address);
            return await this.transactionFactory
                .useTransaction(farmAddress)
                .resume(farmAddress);
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
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        try {
            await this.farmFactory
                .useService(farmAddress)
                .requireOwner(farmAddress, user.address);
            return await this.transactionFactory
                .useTransaction(farmAddress)
                .registerFarmToken(
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
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        try {
            await this.farmFactory
                .useService(farmAddress)
                .requireOwner(farmAddress, user.address);
            return await this.transactionFactory
                .useTransaction(farmAddress)
                .setLocalRolesFarmToken(farmAddress);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => TransactionModel)
    async enterFarm(
        @Args() args: EnterFarmArgs,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        return await this.genericQuery(() =>
            this.transactionFactory
                .useTransaction(args.farmAddress)
                .enterFarm(user.address, args),
        );
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => TransactionModel)
    async exitFarm(
        @Args() args: ExitFarmArgs,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        return await this.genericQuery(() =>
            this.transactionFactory
                .useTransaction(args.farmAddress)
                .exitFarm(user.address, args),
        );
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => TransactionModel)
    async claimRewards(
        @Args() args: ClaimRewardsArgs,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        return await this.genericQuery(() =>
            this.transactionFactory
                .useTransaction(args.farmAddress)
                .claimRewards(user.address, args),
        );
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => TransactionModel)
    async compoundRewards(
        @Args() args: CompoundRewardsArgs,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        return await this.genericQuery(() =>
            this.transactionFactory
                .useTransaction(args.farmAddress)
                .compoundRewards(user.address, args),
        );
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => TransactionModel)
    async migrateToNewFarm(
        @Args() args: ExitFarmArgs,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        if (farmVersion(args.farmAddress) !== FarmVersion.V1_2) {
            throw new ApolloError('invalid farm version');
        }
        return await this.genericQuery(() =>
            this.farmTransactionV1_2.migrateToNewFarm(user.address, args),
        );
    }

    @UseGuards(GqlAdminGuard)
    @Query(() => TransactionModel)
    async setFarmMigrationConfig(
        @Args() args: FarmMigrationConfigArgs,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        if (farmVersion(args.oldFarmAddress) !== FarmVersion.V1_2) {
            throw new ApolloError('invalid farm version');
        }
        try {
            await this.farmFactory
                .useService(args.oldFarmAddress)
                .requireOwner(args.oldFarmAddress, user.address);
            return await this.farmTransactionV1_2.setFarmMigrationConfig(args);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAdminGuard)
    @Query(() => TransactionModel)
    async stopRewardsAndMigrateRps(
        @Args('farmAddress') farmAddress: string,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        if (farmVersion(farmAddress) !== FarmVersion.V1_2) {
            throw new ApolloError('invalid farm version');
        }
        try {
            await this.farmFactory
                .useService(farmAddress)
                .requireOwner(farmAddress, user.address);
            return this.farmTransactionV1_2.stopRewardsAndMigrateRps(
                farmAddress,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }
}
