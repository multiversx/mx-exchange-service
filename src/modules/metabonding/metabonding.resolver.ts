import { UseGuards } from '@nestjs/common';
import { ResolveField, Resolver, Query, Args } from '@nestjs/graphql';
import { AuthUser } from '../auth/auth.user';
import { UserAuthResult } from '../auth/user.auth.result';
import { InputTokenModel } from 'src/models/inputToken.model';
import { NftCollection } from 'src/modules/tokens/models/nftCollection.model';
import { TransactionModel } from 'src/models/transaction.model';
import { JwtOrNativeAuthGuard } from '../auth/jwt.or.native.auth.guard';
import {
    MetabondingStakingModel,
    UserEntryModel,
} from './models/metabonding.model';
import { MetabondingService } from './services/metabonding.service';
import { MetabondingTransactionService } from './services/metabonding.transactions.service';
import { MetabondingAbiService } from './services/metabonding.abi.service';
import { LockedTokenValidator } from './validators/locked.token.validator';

@Resolver(() => MetabondingStakingModel)
export class MetabondingResolver {
    constructor(
        private readonly metabondingService: MetabondingService,
        private readonly metabondingAbi: MetabondingAbiService,
        private readonly metabondingTransactions: MetabondingTransactionService,
    ) {}

    @ResolveField()
    async lockedAssetToken(): Promise<NftCollection> {
        return this.metabondingService.lockedAssetToken();
    }

    @ResolveField()
    async lockedAssetTokenSupply(): Promise<string> {
        return this.metabondingAbi.totalLockedAssetSupply();
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
        return this.metabondingAbi.userEntry(user.address);
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => TransactionModel)
    async stakeLockedAssetMetabonding(
        @Args('inputTokens', LockedTokenValidator) inputTokens: InputTokenModel,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        return this.metabondingTransactions.stakeLockedAsset(
            user.address,
            inputTokens,
        );
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => TransactionModel)
    async unstakeMetabonding(
        @Args('unstakeAmount') unstakeAmount: string,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        return this.metabondingTransactions.unstake(
            user.address,
            unstakeAmount,
        );
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => TransactionModel)
    async unbondMetabonding(
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        return this.metabondingTransactions.unbond(user.address);
    }
}
