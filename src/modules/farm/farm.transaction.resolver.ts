import { UseGuards } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { AuthUser } from '../auth/auth.user';
import { UserAuthResult } from '../auth/user.auth.result';
import { TransactionModel } from 'src/models/transaction.model';
import { JwtOrNativeAuthGuard } from '../auth/jwt.or.native.auth.guard';
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
import { JwtOrNativeAdminGuard } from '../auth/jwt.or.native.admin.guard';

@Resolver()
export class FarmTransactionResolver {
    constructor(
        private readonly farmFactory: FarmFactoryService,
        private readonly transactionFactory: FarmTransactionFactory,
        private readonly farmTransactionV1_2: FarmTransactionServiceV1_2,
    ) {}

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => TransactionModel)
    async mergeFarmTokens(
        @Args() args: MergeFarmTokensArgs,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        return this.transactionFactory
            .useTransaction(args.farmAddress)
            .mergeFarmTokens(user.address, args.farmAddress, args.payments);
    }

    @UseGuards(JwtOrNativeAdminGuard)
    @Query(() => TransactionModel)
    async endProduceRewards(
        @Args('farmAddress') farmAddress: string,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        await this.farmFactory
            .useService(farmAddress)
            .requireOwner(farmAddress, user.address);
        return this.transactionFactory
            .useTransaction(farmAddress)
            .endProduceRewards(user.address, farmAddress);
    }

    @UseGuards(JwtOrNativeAdminGuard)
    @Query(() => TransactionModel)
    async setPerBlockRewardAmount(
        @Args('farmAddress') farmAddress: string,
        @Args('amount') amount: string,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        await this.farmFactory
            .useService(farmAddress)
            .requireOwner(farmAddress, user.address);
        return this.transactionFactory
            .useTransaction(farmAddress)
            .setPerBlockRewardAmount(user.address, farmAddress, amount);
    }

    @UseGuards(JwtOrNativeAdminGuard)
    @Query(() => TransactionModel)
    async startProduceRewards(
        @Args('farmAddress') farmAddress: string,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        await this.farmFactory
            .useService(farmAddress)
            .requireOwner(farmAddress, user.address);
        return this.transactionFactory
            .useTransaction(farmAddress)
            .startProduceRewards(user.address, farmAddress);
    }

    @UseGuards(JwtOrNativeAdminGuard)
    @Query(() => TransactionModel)
    async setPenaltyPercent(
        @Args('farmAddress') farmAddress: string,
        @Args('percent') percent: number,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        await this.farmFactory
            .useService(farmAddress)
            .requireOwner(farmAddress, user.address);
        return this.transactionFactory
            .useTransaction(farmAddress)
            .setPenaltyPercent(user.address, farmAddress, percent);
    }

    @UseGuards(JwtOrNativeAdminGuard)
    @Query(() => TransactionModel)
    async setMinimumFarmingEpochs(
        @Args('farmAddress') farmAddress: string,
        @Args('epochs') epochs: number,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        await this.farmFactory
            .useService(farmAddress)
            .requireOwner(farmAddress, user.address);
        return this.transactionFactory
            .useTransaction(farmAddress)
            .setMinimumFarmingEpochs(user.address, farmAddress, epochs);
    }

    @UseGuards(JwtOrNativeAdminGuard)
    @Query(() => TransactionModel)
    async setTransferExecGasLimit(
        @Args('farmAddress') farmAddress: string,
        @Args('gasLimit') gasLimit: number,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        await this.farmFactory
            .useService(farmAddress)
            .requireOwner(farmAddress, user.address);
        return this.transactionFactory
            .useTransaction(farmAddress)
            .setTransferExecGasLimit(user.address, farmAddress, gasLimit);
    }

    @UseGuards(JwtOrNativeAdminGuard)
    @Query(() => TransactionModel)
    async setBurnGasLimit(
        @Args('farmAddress') farmAddress: string,
        @Args('gasLimit') gasLimit: number,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        await this.farmFactory
            .useService(farmAddress)
            .requireOwner(farmAddress, user.address);
        return this.transactionFactory
            .useTransaction(farmAddress)
            .setBurnGasLimit(user.address, farmAddress, gasLimit);
    }

    @UseGuards(JwtOrNativeAdminGuard)
    @Query(() => TransactionModel)
    async pauseFarm(
        @Args('farmAddress') farmAddress: string,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        await this.farmFactory
            .useService(farmAddress)
            .requireOwner(farmAddress, user.address);
        return this.transactionFactory
            .useTransaction(farmAddress)
            .pause(user.address, farmAddress);
    }

    @UseGuards(JwtOrNativeAdminGuard)
    @Query(() => TransactionModel)
    async resumeFarm(
        @Args('farmAddress') farmAddress: string,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        await this.farmFactory
            .useService(farmAddress)
            .requireOwner(farmAddress, user.address);
        return this.transactionFactory
            .useTransaction(farmAddress)
            .resume(user.address, farmAddress);
    }

    @UseGuards(JwtOrNativeAdminGuard)
    @Query(() => TransactionModel)
    async registerFarmToken(
        @Args('farmAddress') farmAddress: string,
        @Args('tokenDisplayName') tokenDisplayName: string,
        @Args('tokenTicker') tokenTicker: string,
        @Args('decimals') decimals: number,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        await this.farmFactory
            .useService(farmAddress)
            .requireOwner(farmAddress, user.address);
        return this.transactionFactory
            .useTransaction(farmAddress)
            .registerFarmToken(
                user.address,
                farmAddress,
                tokenDisplayName,
                tokenTicker,
                decimals,
            );
    }

    @UseGuards(JwtOrNativeAdminGuard)
    @Query(() => TransactionModel)
    async setLocalRolesFarmToken(
        @Args('farmAddress') farmAddress: string,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        await this.farmFactory
            .useService(farmAddress)
            .requireOwner(farmAddress, user.address);
        return this.transactionFactory
            .useTransaction(farmAddress)
            .setLocalRolesFarmToken(user.address, farmAddress);
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => TransactionModel)
    async enterFarm(
        @Args() args: EnterFarmArgs,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        return this.transactionFactory
            .useTransaction(args.farmAddress)
            .enterFarm(user.address, args);
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => TransactionModel)
    async exitFarm(
        @Args() args: ExitFarmArgs,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        return this.transactionFactory
            .useTransaction(args.farmAddress)
            .exitFarm(user.address, args);
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => TransactionModel)
    async claimRewards(
        @Args() args: ClaimRewardsArgs,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        return this.transactionFactory
            .useTransaction(args.farmAddress)
            .claimRewards(user.address, args);
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => TransactionModel)
    async compoundRewards(
        @Args() args: CompoundRewardsArgs,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        return this.transactionFactory
            .useTransaction(args.farmAddress)
            .compoundRewards(user.address, args);
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => TransactionModel)
    async migrateToNewFarm(
        @Args() args: ExitFarmArgs,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        if (farmVersion(args.farmAddress) !== FarmVersion.V1_2) {
            throw new Error('invalid farm version');
        }
        return this.farmTransactionV1_2.migrateToNewFarm(user.address, args);
    }

    @UseGuards(JwtOrNativeAdminGuard)
    @Query(() => TransactionModel)
    async setFarmMigrationConfig(
        @Args() args: FarmMigrationConfigArgs,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        if (farmVersion(args.oldFarmAddress) !== FarmVersion.V1_2) {
            throw new Error('invalid farm version');
        }
        await this.farmFactory
            .useService(args.oldFarmAddress)
            .requireOwner(args.oldFarmAddress, user.address);
        return this.farmTransactionV1_2.setFarmMigrationConfig(
            user.address,
            args,
        );
    }

    @UseGuards(JwtOrNativeAdminGuard)
    @Query(() => TransactionModel)
    async stopRewardsAndMigrateRps(
        @Args('farmAddress') farmAddress: string,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        if (farmVersion(farmAddress) !== FarmVersion.V1_2) {
            throw new Error('invalid farm version');
        }
        await this.farmFactory
            .useService(farmAddress)
            .requireOwner(farmAddress, user.address);
        return this.farmTransactionV1_2.stopRewardsAndMigrateRps(
            user.address,
            farmAddress,
        );
    }
}
