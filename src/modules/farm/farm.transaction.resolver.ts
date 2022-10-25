import { UseGuards } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { ApolloError } from 'apollo-server-express';
import { User } from 'src/helpers/userDecorator';
import { TransactionModel } from 'src/models/transaction.model';
import { GqlAdminGuard } from 'src/modules/auth/gql.admin.guard';
import { GqlAuthGuard } from 'src/modules/auth/gql.auth.guard';
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

    @UseGuards(GqlAuthGuard)
    @Query(() => TransactionModel)
    async mergeFarmTokens(
        @Args() args: MergeFarmTokensArgs,
        @User() user: any,
    ): Promise<TransactionModel> {
        return await this.transactionFactory
            .transaction(args.farmAddress)
            .mergeFarmTokens(user.publicKey, args.farmAddress, args.payments);
    }

    @UseGuards(GqlAdminGuard)
    @Query(() => TransactionModel)
    async endProduceRewards(
        @Args('farmAddress') farmAddress: string,
        @User() user: any,
    ): Promise<TransactionModel> {
        try {
            await this.farmFactory
                .service(farmAddress)
                .requireOwner(farmAddress, user.publicKey);
            return await this.transactionFactory
                .transaction(farmAddress)
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
        @User() user: any,
    ): Promise<TransactionModel> {
        try {
            await this.farmFactory
                .service(farmAddress)
                .requireOwner(farmAddress, user.publicKey);
            return await this.transactionFactory
                .transaction(farmAddress)
                .setPerBlockRewardAmount(farmAddress, amount);
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
            await this.farmFactory
                .service(farmAddress)
                .requireOwner(farmAddress, user.publicKey);
            return await this.transactionFactory
                .transaction(farmAddress)
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
        @User() user: any,
    ): Promise<TransactionModel> {
        try {
            await this.farmFactory
                .service(farmAddress)
                .requireOwner(farmAddress, user.publicKey);
            return await this.transactionFactory
                .transaction(farmAddress)
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
        @User() user: any,
    ): Promise<TransactionModel> {
        try {
            await this.farmFactory
                .service(farmAddress)
                .requireOwner(farmAddress, user.publicKey);
            return await this.transactionFactory
                .transaction(farmAddress)
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
        @User() user: any,
    ): Promise<TransactionModel> {
        try {
            await this.farmFactory
                .service(farmAddress)
                .requireOwner(farmAddress, user.publicKey);
            return await this.transactionFactory
                .transaction(farmAddress)
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
        @User() user: any,
    ): Promise<TransactionModel> {
        try {
            await this.farmFactory
                .service(farmAddress)
                .requireOwner(farmAddress, user.publicKey);
            return await this.transactionFactory
                .transaction(farmAddress)
                .setBurnGasLimit(farmAddress, gasLimit);
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
            await this.farmFactory
                .service(farmAddress)
                .requireOwner(farmAddress, user.publicKey);
            return await this.transactionFactory
                .transaction(farmAddress)
                .pause(farmAddress);
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
            await this.farmFactory
                .service(farmAddress)
                .requireOwner(farmAddress, user.publicKey);
            return await this.transactionFactory
                .transaction(farmAddress)
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
        @User() user: any,
    ): Promise<TransactionModel> {
        try {
            await this.farmFactory
                .service(farmAddress)
                .requireOwner(farmAddress, user.publicKey);
            return await this.transactionFactory
                .transaction(farmAddress)
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
        @User() user: any,
    ): Promise<TransactionModel> {
        try {
            await this.farmFactory
                .service(farmAddress)
                .requireOwner(farmAddress, user.publicKey);
            return await this.transactionFactory
                .transaction(farmAddress)
                .setLocalRolesFarmToken(farmAddress);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => TransactionModel)
    async enterFarm(
        @Args() args: EnterFarmArgs,
        @User() user: any,
    ): Promise<TransactionModel> {
        return await this.genericQuery(() =>
            this.transactionFactory
                .transaction(args.farmAddress)
                .enterFarm(user.publicKey, args),
        );
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => TransactionModel)
    async exitFarm(
        @Args() args: ExitFarmArgs,
        @User() user: any,
    ): Promise<TransactionModel> {
        return await this.genericQuery(() =>
            this.transactionFactory
                .transaction(args.farmAddress)
                .exitFarm(user.publicKey, args),
        );
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => TransactionModel)
    async claimRewards(
        @Args() args: ClaimRewardsArgs,
        @User() user: any,
    ): Promise<TransactionModel> {
        return await this.genericQuery(() =>
            this.transactionFactory
                .transaction(args.farmAddress)
                .claimRewards(user.publicKey, args),
        );
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => TransactionModel)
    async compoundRewards(
        @Args() args: CompoundRewardsArgs,
        @User() user: any,
    ): Promise<TransactionModel> {
        return await this.genericQuery(() =>
            this.transactionFactory
                .transaction(args.farmAddress)
                .compoundRewards(user.publicKey, args),
        );
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => TransactionModel)
    async migrateToNewFarm(
        @Args() args: ExitFarmArgs,
        @User() user: any,
    ): Promise<TransactionModel> {
        if (farmVersion(args.farmAddress) !== FarmVersion.V1_2) {
            throw new ApolloError('invalid farm version');
        }
        return await this.genericQuery(() =>
            this.farmTransactionV1_2.migrateToNewFarm(user.publicKey, args),
        );
    }

    @UseGuards(GqlAdminGuard)
    @Query(() => TransactionModel)
    async setFarmMigrationConfig(
        @Args() args: FarmMigrationConfigArgs,
        @User() user: any,
    ): Promise<TransactionModel> {
        if (farmVersion(args.oldFarmAddress) !== FarmVersion.V1_2) {
            throw new ApolloError('invalid farm version');
        }
        try {
            await this.farmFactory
                .service(args.oldFarmAddress)
                .requireOwner(args.oldFarmAddress, user.publicKey);
            return await this.farmTransactionV1_2.setFarmMigrationConfig(args);
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
        if (farmVersion(farmAddress) !== FarmVersion.V1_2) {
            throw new ApolloError('invalid farm version');
        }
        try {
            await this.farmFactory
                .service(farmAddress)
                .requireOwner(farmAddress, user.publicKey);
            return this.farmTransactionV1_2.stopRewardsAndMigrateRps(
                farmAddress,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }
}
