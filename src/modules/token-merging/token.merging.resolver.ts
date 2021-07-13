import { Inject } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { GenericEsdtAmountPair } from 'src/models/proxy.model';
import { TransactionModel } from 'src/models/transaction.model';
import {
    CompoundRewardsArgs,
    DepositTokenArgs,
    TokensMergingArgs,
    UserNftDepositArgs,
    WithdrawTokenFromDepositArgs,
} from './dto/token.merging.args';
import { TokenMergingService } from './token.merging.service';
import { TokenMergingTransactionsService } from './token.merging.transactions.service';

@Resolver()
export class TokenMergingResolver {
    constructor(
        @Inject(TokenMergingTransactionsService)
        private readonly mergeTokensTransactions: TokenMergingTransactionsService,
        @Inject(TokenMergingService)
        private readonly mergeTokensService: TokenMergingService,
    ) {}

    @Query(returns => [GenericEsdtAmountPair])
    async userNftDeposit(
        @Args() args: UserNftDepositArgs,
    ): Promise<GenericEsdtAmountPair[]> {
        return await this.mergeTokensService.getNftDeposit(args);
    }

    @Query(returns => TransactionModel)
    async depositTokens(
        @Args() args: DepositTokenArgs,
    ): Promise<TransactionModel> {
        return await this.mergeTokensTransactions.depositTokens(args);
    }

    @Query(returns => TransactionModel)
    async withdrawAllTokensFromDeposit(
        @Args() args: TokensMergingArgs,
    ): Promise<TransactionModel> {
        return await this.mergeTokensTransactions.withdrawAllTokensFromDeposit(
            args,
        );
    }

    @Query(returns => TransactionModel)
    async withdrawTokenFromDeposit(
        @Args() args: WithdrawTokenFromDepositArgs,
    ): Promise<TransactionModel> {
        return await this.mergeTokensTransactions.withdrawTokenFromDeposit(
            args,
        );
    }

    @Query(returns => TransactionModel)
    async compoundRewards(
        @Args() args: CompoundRewardsArgs,
    ): Promise<TransactionModel> {
        return await this.mergeTokensTransactions.compoundRewards(args);
    }
}
