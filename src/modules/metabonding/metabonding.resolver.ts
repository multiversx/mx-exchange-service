import { Inject, UseGuards } from '@nestjs/common';
import { ResolveField, Resolver, Query, Args } from '@nestjs/graphql';
import { ApolloError } from 'apollo-server-express';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { AuthUser } from '../auth/auth.user';
import { UserAuthResult } from '../auth/user.auth.result';
import { InputTokenModel } from 'src/models/inputToken.model';
import { NftCollection } from 'src/modules/tokens/models/nftCollection.model';
import { TransactionModel } from 'src/models/transaction.model';
import { Logger } from 'winston';
import { JwtOrNativeAuthGuard } from '../auth/jwt.or.native.auth.guard';
import {
    MetabondingStakingModel,
    UserEntryModel,
} from './models/metabonding.model';
import { MetabondingGetterService } from './services/metabonding.getter.service';
import { MetabondingService } from './services/metabonding.service';
import { MetabondingTransactionService } from './services/metabonding.transactions.service';
import { GenericResolver } from '../../services/generics/generic.resolver';

@Resolver(() => MetabondingStakingModel)
export class MetabondingResolver extends GenericResolver {
    constructor(
        private readonly metabondingService: MetabondingService,
        private readonly metabondingGetter: MetabondingGetterService,
        private readonly metabondingTransactions: MetabondingTransactionService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {
        super();
    }

    @ResolveField()
    async lockedAssetToken(): Promise<NftCollection> {
        return await this.genericFieldResolver(() =>
            this.metabondingGetter.getLockedAssetToken(),
        );
    }

    @ResolveField()
    async lockedAssetTokenSupply(): Promise<string> {
        return await this.genericFieldResolver(() =>
            this.metabondingGetter.getTotalLockedAssetSupply(),
        );
    }

    @Query(() => MetabondingStakingModel)
    metabondingStaking(): MetabondingStakingModel {
        return this.metabondingService.getMetabondingStaking();
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => UserEntryModel)
    async metabondingStakedPosition(
        @AuthUser() user: UserAuthResult,
    ): Promise<UserEntryModel> {
        try {
            return await this.metabondingGetter.getUserEntry(user.address);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => TransactionModel)
    async stakeLockedAssetMetabonding(
        @Args('inputTokens') inputTokens: InputTokenModel,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        try {
            return await this.metabondingTransactions.stakeLockedAsset(
                user.address,
                inputTokens,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(JwtOrNativeAuthGuard)
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

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => TransactionModel)
    async unbondMetabonding(
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        try {
            return await this.metabondingTransactions.unbond(user.address);
        } catch (error) {
            throw new ApolloError(error);
        }
    }
}
