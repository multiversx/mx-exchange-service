import { UseGuards } from '@nestjs/common';
import { Query, ResolveField, Resolver } from '@nestjs/graphql';
import { scAddress } from 'src/config';
import { AuthUser } from '../auth/auth.user';
import { UserAuthResult } from '../auth/user.auth.result';
import { TransactionModel } from 'src/models/transaction.model';
import { JwtOrNativeAuthGuard } from '../auth/jwt.or.native.auth.guard';
import { TokenUnstakeModel, UnstakePairModel } from './models/token.unstake.model';
import { TokenUnstakeTransactionService } from './services/token.unstake.transaction.service';
import { TokenUnstakeAbiService } from './services/token.unstake.abi.service';

@Resolver(() => TokenUnstakeModel)
export class TokenUnstakeResolver {
    constructor(
        private readonly tokenUnstakeAbi: TokenUnstakeAbiService,
        private readonly tokenUnstakeTransactions: TokenUnstakeTransactionService,
    ) {}

    @ResolveField()
    async unbondEpochs(): Promise<number> {
        return this.tokenUnstakeAbi.unbondEpochs();
    }

    @ResolveField()
    async feesBurnPercentage(): Promise<number> {
        return this.tokenUnstakeAbi.feesBurnPercentage();
    }

    @ResolveField()
    async feesCollectorAddress(): Promise<string> {
        return this.tokenUnstakeAbi.feesCollectorAddress();
    }

    @ResolveField()
    async energyFactoryAddress(): Promise<string> {
        return this.tokenUnstakeAbi.energyFactoryAddress();
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
        return this.tokenUnstakeAbi.unlockedTokensForUser(user.address);
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => TransactionModel)
    async claimUnlockedTokens(
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        return this.tokenUnstakeTransactions.claimUnlockedTokens(user.address);
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => TransactionModel)
    async cancelUnbond(
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        return this.tokenUnstakeTransactions.cancelUnbond(user.address);
    }
}
