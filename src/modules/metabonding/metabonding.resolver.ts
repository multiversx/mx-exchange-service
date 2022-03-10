import { Inject, UseGuards } from '@nestjs/common';
import { ResolveField, Resolver, Query, Args } from '@nestjs/graphql';
import { ApolloError } from 'apollo-server-express';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { User } from 'src/helpers/userDecorator';
import { InputTokenModel } from 'src/models/inputToken.model';
import { TransactionModel } from 'src/models/transaction.model';
import { Logger } from 'winston';
import { GqlAuthGuard } from '../auth/gql.auth.guard';
import {
    MetabondingStakingModel,
    StakedUserPosition,
} from './models/metabonding.model';
import { MetabondingGetterService } from './services/metabonding.getter.service';
import { MetabondingService } from './services/metabonding.service';
import { MetabondingTransactionService } from './services/metabonding.transactions.service';

@Resolver(() => MetabondingStakingModel)
export class MetabondingResolver {
    constructor(
        private readonly metabondingService: MetabondingService,
        private readonly metabondingGetter: MetabondingGetterService,
        private readonly metabondingTransactions: MetabondingTransactionService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    private async genericFieldResover(fieldResolver: () => any): Promise<any> {
        try {
            return await fieldResolver();
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async lockedAssetTokenID(): Promise<string> {
        return await this.genericFieldResover(() =>
            this.metabondingGetter.getLockedAssetTokenID(),
        );
    }

    @ResolveField()
    async lockedAssetTokenSupply(): Promise<string> {
        return await this.genericFieldResover(() =>
            this.metabondingGetter.getTotalLockedAssetSupply(),
        );
    }

    @Query(() => MetabondingStakingModel)
    metabondingStaking(): MetabondingStakingModel {
        return this.metabondingService.getMetabondingStaking();
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => StakedUserPosition)
    async metabondingStakedPosition(
        @User() user: any,
    ): Promise<StakedUserPosition> {
        try {
            return await this.metabondingGetter.getUserStakedPosition(
                user.publicKey,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => TransactionModel)
    async stakeLockedAssetMetabonding(
        @Args('inputTokens') inputTokens: InputTokenModel,
        @User() user: any,
    ): Promise<TransactionModel> {
        try {
            return await this.metabondingTransactions.stakeLockedAsset(
                user.publicKey,
                inputTokens,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => TransactionModel)
    async unstakeMetabonding(): Promise<TransactionModel> {
        try {
            return await this.metabondingTransactions.unstake();
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => TransactionModel)
    async unbondMetabonding(): Promise<TransactionModel> {
        try {
            return await this.metabondingTransactions.unbond();
        } catch (error) {
            throw new ApolloError(error);
        }
    }
}
