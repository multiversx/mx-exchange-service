import { LockedFarmTokenAttributes } from '@elrondnetwork/erdjs-dex';
import { UseGuards } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { ApolloError } from 'apollo-server-express';
import { AuthUser } from '../auth/auth.user';
import { UserAuthResult } from '../auth/user.auth.result';
import { InputTokenModel } from 'src/models/inputToken.model';
import { TransactionModel } from 'src/models/transaction.model';
import { GenericResolver } from 'src/services/generics/generic.resolver';
import { farmVersion } from 'src/utils/farm.utils';
import { GqlAuthGuard } from '../auth/gql.auth.guard';
import { FarmGetterFactory } from '../farm/farm.getter.factory';
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
        private readonly farmGetterFactory: FarmGetterFactory,
        private readonly simpleLockTransactions: SimpleLockTransactionService,
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
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        try {
            const simpleLockAddress =
                await this.simpleLockService.getSimpleLockAddressFromInputTokens(
                    [inputTokens],
                );
            return await this.simpleLockTransactions.unlockTokens(
                simpleLockAddress,
                user.address,
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
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel[]> {
        try {
            const simpleLockAddress =
                await this.simpleLockService.getSimpleLockAddressFromInputTokens(
                    inputTokens,
                );
            return await this.simpleLockTransactions.addLiquidityLockedTokenBatch(
                simpleLockAddress,
                user.address,
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
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel[]> {
        try {
            const simpleLockAddress =
                await this.simpleLockService.getSimpleLockAddressFromInputTokens(
                    [inputTokens],
                );
            return await this.simpleLockTransactions.removeLiquidityLockedToken(
                simpleLockAddress,
                user.address,
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
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        try {
            const simpleLockAddress =
                await this.simpleLockService.getSimpleLockAddressFromInputTokens(
                    inputTokens,
                );
            return await this.simpleLockTransactions.enterFarmLockedToken(
                simpleLockAddress,
                user.address,
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
        @Args('exitAmount', { nullable: true }) exitAmount: string,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        try {
            const simpleLockAddress =
                await this.simpleLockService.getSimpleLockAddressFromInputTokens(
                    [inputTokens],
                );
            const decodedAttributes = LockedFarmTokenAttributes.fromAttributes(
                inputTokens.attributes,
            );
            const [lockedTokenID, farmAddress] = await Promise.all([
                this.simpleLockGetter.getLockedTokenID(simpleLockAddress),
                this.farmGetterFactory.getFarmAddressByFarmTokenID(
                    decodedAttributes.farmTokenID,
                ),
            ]);
            const version = farmVersion(farmAddress);
            if (
                decodedAttributes.farmType === 'FarmWithBoostedRewards' ||
                lockedTokenID.includes('LKESDT')
            ) {
                return await this.simpleLockTransactions.exitFarmLockedToken(
                    simpleLockAddress,
                    user.address,
                    inputTokens,
                    version,
                    exitAmount,
                );
            } else {
                return await this.simpleLockTransactions.exitFarmOldToken(
                    simpleLockAddress,
                    user.address,
                    inputTokens,
                );
            }
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => TransactionModel)
    async claimRewardsFarmLockedToken(
        @Args('inputTokens', FarmProxyTokensValidationPipe)
        inputTokens: InputTokenModel,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        try {
            const simpleLockAddress =
                await this.simpleLockService.getSimpleLockAddressFromInputTokens(
                    [inputTokens],
                );

            return await this.simpleLockTransactions.farmClaimRewardsLockedToken(
                simpleLockAddress,
                user.address,
                inputTokens,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }
}
