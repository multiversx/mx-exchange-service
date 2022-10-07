import { Inject, UseGuards } from '@nestjs/common';
import { ResolveField, Resolver, Query, Args } from '@nestjs/graphql';
import { ApolloError } from 'apollo-server-express';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { User } from 'src/helpers/userDecorator';
import { InputTokenModel } from 'src/models/inputToken.model';
import { NftCollection } from 'src/modules/tokens/models/nftCollection.model';
import { TransactionModel } from 'src/models/transaction.model';
import { Logger } from 'winston';
import { GqlAuthGuard } from '../auth/gql.auth.guard';
import {
    MetabondingStakingModel,
    UserEntryModel,
} from './models/metabonding.model';
import { MetabondingGetterService } from './services/metabonding.getter.service';
import { MetabondingService } from './services/metabonding.service';
import { MetabondingTransactionService } from './services/metabonding.transactions.service';
import { genericFieldResover } from "../../utils/resolver";

@Resolver(() => MetabondingStakingModel)
export class MetabondingResolver {
    constructor(
        private readonly metabondingService: MetabondingService,
        private readonly metabondingGetter: MetabondingGetterService,
        private readonly metabondingTransactions: MetabondingTransactionService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    @ResolveField()
    async lockedAssetToken(): Promise<NftCollection> {
        return await genericFieldResover(() =>
            this.metabondingGetter.getLockedAssetToken(),
        );
    }

    @ResolveField()
    async lockedAssetTokenSupply(): Promise<string> {
        return await genericFieldResover(() =>
            this.metabondingGetter.getTotalLockedAssetSupply(),
        );
    }

    @Query(() => MetabondingStakingModel)
    metabondingStaking(): MetabondingStakingModel {
        return this.metabondingService.getMetabondingStaking();
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => UserEntryModel)
    async metabondingStakedPosition(
        @User() user: any,
    ): Promise<UserEntryModel> {
        try {
            return await this.metabondingGetter.getUserEntry(user.publicKey);
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
    async unstakeMetabonding(
        @Args('unstakeAmount') unstakeAmount: string,
    ): Promise<TransactionModel> {
        try {
            return await this.metabondingTransactions.unstake(unstakeAmount);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => TransactionModel)
    async unbondMetabonding(@User() user: any): Promise<TransactionModel> {
        try {
            return await this.metabondingTransactions.unbond(user.publicKey);
        } catch (error) {
            throw new ApolloError(error);
        }
    }
}
