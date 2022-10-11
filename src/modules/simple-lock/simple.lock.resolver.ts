import { UseGuards } from '@nestjs/common';
import { Args, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { ApolloError } from 'apollo-server-express';
import { gasConfig } from 'src/config';
import { User } from 'src/helpers/userDecorator';
import { InputTokenModel } from 'src/models/inputToken.model';
import { NftCollection } from 'src/modules/tokens/models/nftCollection.model';
import { TransactionModel } from 'src/models/transaction.model';
import { GqlAuthGuard } from '../auth/gql.auth.guard';
import { DecodeAttributesArgs } from '../proxy/models/proxy.args';
import {
    LockedTokenAttributesModel,
    SimpleLockModel,
} from './models/simple.lock.model';
import { SimpleLockGetterService } from './services/simple.lock.getter.service';
import { SimpleLockService } from './services/simple.lock.service';
import { SimpleLockTransactionService } from './services/simple.lock.transactions.service';
import { UnlockTokensValidationPipe } from './validators/unlock.tokens.validator';
import { LiquidityTokensValidationPipe } from './validators/liquidity.token.validator';
import { LpProxyTokensValidationPipe } from './validators/lpProxy.token.validator';
import { FarmProxyTokensValidationPipe } from './validators/farm.token.validator';
import { EmterFarmProxyTokensValidationPipe } from './validators/enter.farm.tokens.validator';

@Resolver(() => SimpleLockModel)
export class SimpleLockResolver {
    constructor(
        private readonly simpleLockService: SimpleLockService,
        private readonly simpleLockGetter: SimpleLockGetterService,
        private readonly simpleLockTransactions: SimpleLockTransactionService,
    ) {}

    private async genericFieldResover(fieldResolver: () => any): Promise<any> {
        try {
            return await fieldResolver();
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async lockedToken(
        @Parent() parent: SimpleLockModel,
    ): Promise<NftCollection> {
        return await this.genericFieldResover(() =>
            this.simpleLockGetter.getLockedToken(parent.address),
        );
    }

    @ResolveField()
    async lpProxyToken(
        @Parent() parent: SimpleLockModel,
    ): Promise<NftCollection> {
        return await this.genericFieldResover(() =>
            this.simpleLockGetter.getLpProxyToken(parent.address),
        );
    }

    @ResolveField()
    async farmProxyToken(
        @Parent() parent: SimpleLockModel,
    ): Promise<NftCollection> {
        return await this.genericFieldResover(() =>
            this.simpleLockGetter.getFarmProxyToken(parent.address),
        );
    }

    @ResolveField()
    async intermediatedPairs(
        @Parent() parent: SimpleLockModel,
    ): Promise<string[]> {
        return await this.genericFieldResover(() =>
            this.simpleLockGetter.getIntermediatedPairs(parent.address),
        );
    }

    @ResolveField()
    async intermediatedFarms(
        @Parent() parent: SimpleLockModel,
    ): Promise<string[]> {
        return await this.genericFieldResover(() =>
            this.simpleLockGetter.getIntermediatedFarms(parent.address),
        );
    }

    @Query(() => [SimpleLockModel])
    async simpleLock(): Promise<SimpleLockModel[]> {
        try {
            return this.simpleLockService.getSimpleLock();
        } catch (error) {}
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => [LockedTokenAttributesModel])
    async lockedTokenAttributes(
        @Args('args') args: DecodeAttributesArgs,
    ): Promise<LockedTokenAttributesModel[]> {
        try {
            return this.simpleLockService.decodeBatchLockedTokenAttributes(
                args,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
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

    // @UseGuards(GqlAuthGuard)
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
}
