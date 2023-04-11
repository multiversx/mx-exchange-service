import { UseGuards } from '@nestjs/common';
import { Query, ResolveField, Resolver } from '@nestjs/graphql';
import { scAddress } from 'src/config';
import { AuthUser } from '../auth/auth.user';
import { UserAuthResult } from '../auth/user.auth.result';
import { TransactionModel } from 'src/models/transaction.model';
import { GenericResolver } from 'src/services/generics/generic.resolver';
import { JwtOrNativeAuthGuard } from '../auth/jwt.or.native.auth.guard';
import {
    TokenUnstakeModel,
    UnstakePairModel,
} from './models/token.unstake.model';
import { TokenUnstakeTransactionService } from './services/token.unstake.transaction.service';
import { TokenUnstakeAbiService } from './services/token.unstake.abi.service';

@Resolver(() => TokenUnstakeModel)
export class TokenUnstakeResolver extends GenericResolver {
    constructor(
        private readonly tokenUnstakeAbi: TokenUnstakeAbiService,
        private readonly tokenUnstakeTransactions: TokenUnstakeTransactionService,
    ) {
        super();
    }

    @ResolveField()
    async unbondEpochs(): Promise<number> {
        return await this.genericFieldResolver(() =>
            this.tokenUnstakeAbi.unbondEpochs(),
        );
    }

    @ResolveField()
    async feesBurnPercentage(): Promise<number> {
        return await this.genericFieldResolver(() =>
            this.tokenUnstakeAbi.feesBurnPercentage(),
        );
    }

    @ResolveField()
    async feesCollectorAddress(): Promise<string> {
        return await this.genericFieldResolver(() =>
            this.tokenUnstakeAbi.feesCollectorAddress(),
        );
    }

    @ResolveField()
    async lastEpochFeeSentToCollector(): Promise<number> {
        return await this.genericFieldResolver(() =>
            this.tokenUnstakeAbi.lastEpochFeeSentToCollector(),
        );
    }

    @ResolveField()
    async energyFactoryAddress(): Promise<string> {
        return await this.genericFieldResolver(() =>
            this.tokenUnstakeAbi.energyFactoryAddress(),
        );
    }

    @Query(() => TokenUnstakeModel)
    async tokenUnstake(): Promise<TokenUnstakeModel> {
        return new TokenUnstakeModel({
            address: scAddress.tokenUnstake,
        });
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => [UnstakePairModel])
    async getUnlockedTokensForUser(
        @AuthUser() user: UserAuthResult,
    ): Promise<UnstakePairModel[]> {
        return await this.genericQuery(() =>
            this.tokenUnstakeAbi.unlockedTokensForUser(user.address),
        );
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => TransactionModel)
    async claimUnlockedTokens(
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        return await this.genericQuery(() =>
            this.tokenUnstakeTransactions.claimUnlockedTokens(user.address),
        );
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => TransactionModel)
    async cancelUnbond(): Promise<TransactionModel> {
        return await this.genericQuery(() =>
            this.tokenUnstakeTransactions.cancelUnbond(),
        );
    }
}
