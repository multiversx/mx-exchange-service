import { UseGuards } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { ApolloError } from 'apollo-server-express';
import { gasConfig } from 'src/config';
import { User } from 'src/helpers/userDecorator';
import { InputTokenModel } from 'src/models/inputToken.model';
import { TransactionModel } from 'src/models/transaction.model';
import { GenericResolver } from 'src/services/generics/generic.resolver';
import { GqlAuthGuard } from '../auth/gql.auth.guard';
import { EnergyGetterService } from './services/energy/energy.getter.service';
import { EnergyTransactionService } from './services/energy/energy.transaction.service';
import { SimpleLockGetterService } from './services/simple.lock.getter.service';
import { SimpleLockTransactionService } from './services/simple.lock.transactions.service';

@Resolver()
export class TransactionResolver extends GenericResolver {
    constructor(
        private readonly simpleLockGetter: SimpleLockGetterService,
        private readonly energyGetter: EnergyGetterService,
        private readonly simpleLockTransactions: SimpleLockTransactionService,
        private readonly energyTransactions: EnergyTransactionService,
    ) {
        super();
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => TransactionModel)
    async lockTokens(
        @Args('inputTokens') inputTokens: InputTokenModel,
        @Args('lockEpochs') lockEpochs: number,
    ): Promise<TransactionModel> {
        try {
            const service = await this.getTransactionService(inputTokens);
            return await service.lockTokens(inputTokens, lockEpochs);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => TransactionModel)
    async unlockTokens(
        @Args('inputTokens') inputTokens: InputTokenModel,
        @User() user: any,
    ): Promise<TransactionModel> {
        try {
            const service = await this.getTransactionService(inputTokens);
            return await service.unlockTokens(user.publicKey, inputTokens);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => [TransactionModel])
    async addLiquidityLockedTokenBatch(
        @Args('inputTokens', { type: () => [InputTokenModel] })
        inputTokens: InputTokenModel[],
        @Args('pairAddress') pairAddress: string,
        @Args('tolerance') tolerance: number,
        @User() user: any,
    ): Promise<TransactionModel[]> {
        try {
            const service = await this.getTransactionService(inputTokens[0]);
            return await service.addLiquidityLockedTokenBatch(
                user.publicKey,
                inputTokens,
                pairAddress,
                tolerance,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => [TransactionModel])
    async removeLiquidityLockedToken(
        @Args('inputTokens') inputTokens: InputTokenModel,
        @Args('attributes') attributes: string,
        @Args('tolerance') tolerance: number,
        @User() user: any,
    ): Promise<TransactionModel[]> {
        try {
            const service = await this.getTransactionService(inputTokens);
            return await service.removeLiquidityLockedToken(
                user.publicKey,
                inputTokens,
                attributes,
                tolerance,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => TransactionModel)
    async enterFarmLockedToken(
        @Args('inputTokens', { type: () => [InputTokenModel] })
        inputTokens: InputTokenModel[],
        @Args('farmAddress') farmAddress: string,
        @User() user: any,
    ): Promise<TransactionModel> {
        try {
            const service = await this.getTransactionService(inputTokens[0]);
            return await service.enterFarmLockedToken(
                user.publicKey,
                inputTokens,
                farmAddress,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => TransactionModel)
    async exitFarmLockedToken(
        @Args('inputTokens') inputTokens: InputTokenModel,
        @User() user: any,
    ): Promise<TransactionModel> {
        try {
            const service = await this.getTransactionService(inputTokens);
            return await service.farmProxyTokenInteraction(
                user.publicKey,
                inputTokens,
                this.exitFarmLockedToken.name,
                gasConfig.simpleLock.exitFarmLockedToken,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => TransactionModel)
    async claimRewardsFarmLockedToken(
        @Args('inputTokens') inputTokens: InputTokenModel,
        @User() user: any,
    ): Promise<TransactionModel> {
        try {
            const service = await this.getTransactionService(inputTokens);
            return await service.farmProxyTokenInteraction(
                user.publicKey,
                inputTokens,
                'farmClaimRewardsLockedToken',
                gasConfig.simpleLock.claimRewardsFarmLockedToken,
            );
        } catch (error) {}
    }

    private async getTransactionService(
        inputTokens: InputTokenModel,
    ): Promise<EnergyTransactionService | SimpleLockTransactionService> {
        switch (inputTokens.tokenID) {
            case await this.energyGetter.getBaseAssetTokenID():
                return this.energyTransactions;
            case await this.simpleLockGetter.getLockedTokenID():
                return this.simpleLockTransactions;
            case await this.energyGetter.getLockedTokenID():
                return this.energyTransactions;
            default:
                return this.simpleLockTransactions;
        }
    }
}
