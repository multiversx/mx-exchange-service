import { Inject, UseGuards } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { GenericEsdtAmountPair } from 'src/modules/proxy/models/proxy.model';
import { TransactionModel } from 'src/models/transaction.model';
import {
    DepositTokenArgs,
    TokensMergingArgs,
    WithdrawTokenFromDepositArgs,
} from './dto/token.merging.args';
import { TokenMergingService } from './token.merging.service';
import { TokenMergingTransactionsService } from './token.merging.transactions.service';
import { GqlAuthGuard } from '../auth/gql.auth.guard';
import { User } from 'src/helpers/userDecorator';

@Resolver()
export class TokenMergingResolver {
    constructor(
        @Inject(TokenMergingTransactionsService)
        private readonly mergeTokensTransactions: TokenMergingTransactionsService,
        @Inject(TokenMergingService)
        private readonly mergeTokensService: TokenMergingService,
    ) {}

    @UseGuards(GqlAuthGuard)
    @Query(returns => [GenericEsdtAmountPair])
    async userNftDeposit(@User() user: any): Promise<GenericEsdtAmountPair[]> {
        return await this.mergeTokensService.getNftDeposit(user.publicKey);
    }

    @UseGuards(GqlAuthGuard)
    @Query(returns => [GenericEsdtAmountPair])
    async userNftDepositProxy(
        @User() user: any,
    ): Promise<GenericEsdtAmountPair[]> {
        return await this.mergeTokensService.getNftDepositProxy(user.publicKey);
    }

    @UseGuards(GqlAuthGuard)
    @Query(returns => TransactionModel)
    async depositTokens(
        @Args() args: DepositTokenArgs,
        @User() user: any,
    ): Promise<TransactionModel> {
        return await this.mergeTokensTransactions.depositTokens(
            user.publicKey,
            args,
        );
    }

    @UseGuards(GqlAuthGuard)
    @Query(returns => TransactionModel)
    async withdrawAllTokensFromDeposit(
        @Args() args: TokensMergingArgs,
    ): Promise<TransactionModel> {
        return await this.mergeTokensTransactions.withdrawAllTokensFromDeposit(
            args,
        );
    }

    @UseGuards(GqlAuthGuard)
    @Query(returns => TransactionModel)
    async withdrawTokenFromDeposit(
        @Args() args: WithdrawTokenFromDepositArgs,
    ): Promise<TransactionModel> {
        return await this.mergeTokensTransactions.withdrawTokenFromDeposit(
            args,
        );
    }
}
