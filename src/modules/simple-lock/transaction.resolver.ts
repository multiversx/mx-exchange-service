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
import { SimpleLockService } from './services/simple.lock.service';
import { SimpleLockTransactionService } from './services/simple.lock.transactions.service';
import { EmterFarmProxyTokensValidationPipe } from './validators/enter.farm.tokens.validator';
import { FarmProxyTokensValidationPipe } from './validators/farm.token.validator';
import { LiquidityTokensValidationPipe } from './validators/liquidity.token.validator';
import { LpProxyTokensValidationPipe } from './validators/lpProxy.token.validator';
import { UnlockTokensValidationPipe } from './validators/unlock.tokens.validator';

@Resolver()
export class TransactionResolver extends GenericResolver {
    constructor(
        private readonly simpleLockService: SimpleLockService,
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
        @Args('simpleLockAddress') simpleLockAddress: string,
    ): Promise<TransactionModel> {
        try {
            return await this.simpleLockTransactions.lockTokens(
                inputTokens,
                lockEpochs,
                simpleLockAddress,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => TransactionModel)
    async unlockTokens(
        @Args('inputTokens', UnlockTokensValidationPipe)
        inputTokens: InputTokenModel,
        @User() user: any,
    ): Promise<TransactionModel> {
        try {
            const simpleLockAddress =
                await this.simpleLockService.getSimpleLockAddressFromInputTokens(
                    [inputTokens],
                );
            return await this.simpleLockTransactions.unlockTokens(
                simpleLockAddress,
                user.publicKey,
                inputTokens,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => [TransactionModel])
    async addLiquidityLockedTokenBatch(
        @Args(
            'inputTokens',
            { type: () => [InputTokenModel] },
            LiquidityTokensValidationPipe,
        )
        inputTokens: InputTokenModel[],
        @Args('pairAddress') pairAddress: string,
        @Args('tolerance') tolerance: number,
        @User() user: any,
    ): Promise<TransactionModel[]> {
        try {
            const simpleLockAddress =
                await this.simpleLockService.getSimpleLockAddressFromInputTokens(
                    inputTokens,
                );
            return await this.simpleLockTransactions.addLiquidityLockedTokenBatch(
                simpleLockAddress,
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
        @Args('inputTokens', LpProxyTokensValidationPipe)
        inputTokens: InputTokenModel,
        @Args('attributes') attributes: string,
        @Args('tolerance') tolerance: number,
        @User() user: any,
    ): Promise<TransactionModel[]> {
        try {
            const simpleLockAddress =
                await this.simpleLockService.getSimpleLockAddressFromInputTokens(
                    [inputTokens],
                );
            return await this.simpleLockTransactions.removeLiquidityLockedToken(
                simpleLockAddress,
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
        @Args(
            'inputTokens',
            { type: () => [InputTokenModel] },
            EmterFarmProxyTokensValidationPipe,
        )
        inputTokens: InputTokenModel[],
        @Args('farmAddress') farmAddress: string,
        @User() user: any,
    ): Promise<TransactionModel> {
        try {
            const simpleLockAddress =
                await this.simpleLockService.getSimpleLockAddressFromInputTokens(
                    inputTokens,
                );
            return await this.simpleLockTransactions.enterFarmLockedToken(
                simpleLockAddress,
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
        @Args('inputTokens', FarmProxyTokensValidationPipe)
        inputTokens: InputTokenModel,
        @User() user: any,
    ): Promise<TransactionModel> {
        try {
            const simpleLockAddress =
                await this.simpleLockService.getSimpleLockAddressFromInputTokens(
                    [inputTokens],
                );
            return await this.simpleLockTransactions.farmProxyTokenInteraction(
                simpleLockAddress,
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
        @Args('inputTokens', FarmProxyTokensValidationPipe)
        inputTokens: InputTokenModel,
        @User() user: any,
    ): Promise<TransactionModel> {
        try {
            const simpleLockAddress =
                await this.simpleLockService.getSimpleLockAddressFromInputTokens(
                    [inputTokens],
                );
            return await this.simpleLockTransactions.farmProxyTokenInteraction(
                simpleLockAddress,
                user.publicKey,
                inputTokens,
                'farmClaimRewardsLockedToken',
                gasConfig.simpleLock.claimRewardsFarmLockedToken,
            );
        } catch (error) {}
    }

    private async getTransactionService(
        inputTokens: InputTokenModel,
        simpleLockAddress: string,
    ): Promise<EnergyTransactionService | SimpleLockTransactionService> {
        switch (inputTokens.tokenID) {
            case await this.energyGetter.getBaseAssetTokenID():
                return this.energyTransactions;
            case await this.simpleLockGetter.getLockedTokenID(
                simpleLockAddress,
            ):
                return this.simpleLockTransactions;
            case await this.energyGetter.getLockedTokenID(simpleLockAddress):
                return this.energyTransactions;
            default:
                return this.simpleLockTransactions;
        }
    }
}
