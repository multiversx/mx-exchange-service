import { UseGuards } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { ApolloError } from 'apollo-server-express';
import { User } from 'src/helpers/userDecorator';
import { TransactionModel } from 'src/models/transaction.model';
import { GqlAdminGuard } from 'src/modules/auth/gql.admin.guard';
import { GqlAuthGuard } from 'src/modules/auth/gql.auth.guard';
import { GenericResolver } from 'src/services/generics/generic.resolver';
import { farmVersion } from 'src/utils/farm.utils';
import {
    ClaimRewardsArgs,
    CompoundRewardsArgs,
    EnterFarmArgs,
    ExitFarmArgs,
    FarmMigrationConfigArgs,
    MergeFarmTokensArgs,
} from '../models/farm.args';
import { FarmVersion } from '../models/farm.model';
import { FarmCustomTransactionService } from '../services/custom/farm.custom.transaction.service';
import { FarmService } from '../services/farm.service';
import { FarmV12TransactionService } from '../services/v1.2/farm.v1.2.transaction.service';
import { FarmV13TransactionService } from '../services/v1.3/farm.v1.3.transaction.service';

@Resolver()
export class FarmTransactionResolver extends GenericResolver {
    constructor(
        private readonly farmV12Transaction: FarmV12TransactionService,
        private readonly farmV13Transaction: FarmV13TransactionService,
        private readonly farmCustomTransaction: FarmCustomTransactionService,
        private readonly farmService: FarmService,
    ) {
        super();
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => TransactionModel)
    async mergeFarmTokens(
        @Args() args: MergeFarmTokensArgs,
        @User() user: any,
    ): Promise<TransactionModel> {
        return await this.farmV12Transaction.mergeFarmTokens(
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
            return await this.getService(farmAddress).endProduceRewards(
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
            return await this.getService(farmAddress).setPerBlockRewardAmount(
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
            return await this.getService(farmAddress).startProduceRewards(
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
            return await this.getService(farmAddress).setPenaltyPercent(
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
            return await this.getService(farmAddress).setMinimumFarmingEpochs(
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
            return await this.getService(farmAddress).setTransferExecGasLimit(
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
            return await this.getService(farmAddress).setBurnGasLimit(
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
            return await this.getService(farmAddress).pause(farmAddress);
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
            return await this.getService(farmAddress).resume(farmAddress);
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
            return await this.getService(farmAddress).registerFarmToken(
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
            return await this.getService(farmAddress).setLocalRolesFarmToken(
                farmAddress,
            );
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
            this.getService(args.farmAddress).enterFarm(user.publicKey, args),
        );
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => TransactionModel)
    async exitFarm(
        @Args() args: ExitFarmArgs,
        @User() user: any,
    ): Promise<TransactionModel> {
        return await this.genericQuery(() =>
            this.getService(args.farmAddress).exitFarm(user.publicKey, args),
        );
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => TransactionModel)
    async claimRewards(
        @Args() args: ClaimRewardsArgs,
        @User() user: any,
    ): Promise<TransactionModel> {
        return await this.genericQuery(() =>
            this.getService(args.farmAddress).claimRewards(
                user.publicKey,
                args,
            ),
        );
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => TransactionModel)
    async compoundRewards(
        @Args() args: CompoundRewardsArgs,
        @User() user: any,
    ): Promise<TransactionModel> {
        return await this.genericQuery(() =>
            this.getService(args.farmAddress).compoundRewards(
                user.publicKey,
                args,
            ),
        );
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => TransactionModel)
    async migrateToNewFarm(
        @Args() args: ExitFarmArgs,
        @User() user: any,
    ): Promise<TransactionModel> {
        return await this.genericQuery(() =>
            this.farmV12Transaction.migrateToNewFarm(user.publicKey, args),
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
            return await this.getService(
                args.oldFarmAddress,
            ).setFarmMigrationConfig(args);
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
            return this.farmV12Transaction.stopRewardsAndMigrateRps(
                farmAddress,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    private getService(
        farmAddress: string,
    ):
        | FarmV12TransactionService
        | FarmV13TransactionService
        | FarmCustomTransactionService {
        switch (farmVersion(farmAddress)) {
            case FarmVersion.V1_2:
                return this.farmV12Transaction;
            case FarmVersion.V1_3:
                return this.farmV13Transaction;
            default:
                return this.farmCustomTransaction;
        }
    }
}
