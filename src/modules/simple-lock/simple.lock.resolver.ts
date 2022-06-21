import { UseGuards } from '@nestjs/common';
import { Args, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { ApolloError } from 'apollo-server-express';
import { gasConfig } from 'src/config';
import { User } from 'src/helpers/userDecorator';
import { InputTokenModel } from 'src/models/inputToken.model';
import { NftCollection } from 'src/modules/tokens/models/nftCollection.model';
import { TransactionModel } from 'src/models/transaction.model';
import { GqlAuthGuard } from '../auth/gql.auth.guard';
import { DecodeAttributesArgs } from '../proxy/models/proxy.args';
import {
    FarmProxyTokenAttributesModel,
    LockedTokenAttributesModel,
    LpProxyTokenAttributesModel,
    SimpleLockModel,
} from './models/simple.lock.model';
import { SimpleLockGetterService } from './services/simple.lock.getter.service';
import { SimpleLockService } from './services/simple.lock.service';
import { SimpleLockTransactionService } from './services/simple.lock.transactions.service';

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
    async lockedToken(): Promise<NftCollection> {
        return await this.genericFieldResover(() =>
            this.simpleLockGetter.getLockedToken(),
        );
    }

    @ResolveField()
    async lpProxyToken(): Promise<NftCollection> {
        return await this.genericFieldResover(() =>
            this.simpleLockGetter.getLpProxyToken(),
        );
    }

    @ResolveField()
    async farmProxyToken(): Promise<NftCollection> {
        return await this.genericFieldResover(() =>
            this.simpleLockGetter.getFarmProxyToken(),
        );
    }

    @ResolveField()
    async intermediatedPairs(): Promise<string[]> {
        return await this.genericFieldResover(() =>
            this.simpleLockGetter.getIntermediatedPairs(),
        );
    }

    @ResolveField()
    async intermediatedFarms(): Promise<string[]> {
        return await this.genericFieldResover(() =>
            this.simpleLockGetter.getIntermediatedFarms(),
        );
    }

    @Query(() => SimpleLockModel)
    async simpleLock(): Promise<SimpleLockModel> {
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
    @Query(() => [FarmProxyTokenAttributesModel])
    async farmProxyTokenAttributes(
        @Args('args') args: DecodeAttributesArgs,
    ): Promise<FarmProxyTokenAttributesModel[]> {
        try {
            return this.simpleLockService.decodeBatchFarmProxyTokenAttributes(
                args,
            );
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
            return await this.simpleLockTransactions.unlockTokens(
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
        @Args('inputTokens', { type: () => [InputTokenModel] })
        inputTokens: InputTokenModel[],
        @Args('pairAddress') pairAddress: string,
        @Args('tolerance') tolerance: number,
        @User() user: any,
    ): Promise<TransactionModel[]> {
        try {
            return await this.simpleLockTransactions.addLiquidityLockedTokenBatch(
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
            return await this.simpleLockTransactions.removeLiquidityLockedToken(
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
            return await this.simpleLockTransactions.enterFarmLockedToken(
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
            return await this.simpleLockTransactions.farmProxyTokenInteraction(
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
            return await this.simpleLockTransactions.farmProxyTokenInteraction(
                user.publicKey,
                inputTokens,
                'farmClaimRewardsLockedToken',
                gasConfig.simpleLock.claimRewardsFarmLockedToken,
            );
        } catch (error) {}
    }
}
