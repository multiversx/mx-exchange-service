import { Inject, UseGuards } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { GenericEsdtAmountPair } from 'src/modules/proxy/models/proxy.model';
import { TransactionModel } from 'src/models/transaction.model';
import {
    DepositTokenArgs,
    TokensMergingArgs,
    UserNftDepositArgs,
    WithdrawTokenFromDepositArgs,
} from './dto/token.merging.args';
import { TokenMergingService } from './token.merging.service';
import { TokenMergingTransactionsService } from './token.merging.transactions.service';
import { JwtAuthenticateGuard } from '../../helpers/guards/jwt.authenticate.guard';

@Resolver()
export class TokenMergingResolver {
    constructor(
        @Inject(TokenMergingTransactionsService)
        private readonly mergeTokensTransactions: TokenMergingTransactionsService,
        @Inject(TokenMergingService)
        private readonly mergeTokensService: TokenMergingService,
    ) {}

    @UseGuards(JwtAuthenticateGuard)
    @Query(returns => [GenericEsdtAmountPair])
    async userNftDeposit(
        @Args() args: UserNftDepositArgs,
    ): Promise<GenericEsdtAmountPair[]> {
        return await this.mergeTokensService.getNftDeposit(args);
    }

    @UseGuards(JwtAuthenticateGuard)
    @Query(returns => [GenericEsdtAmountPair])
    async userNftDepositProxy(
        @Args() args: UserNftDepositArgs,
    ): Promise<GenericEsdtAmountPair[]> {
        return await this.mergeTokensService.getNftDepositProxy(args);
    }

    @UseGuards(JwtAuthenticateGuard)
    @Query(returns => TransactionModel)
    async depositTokens(
        @Args() args: DepositTokenArgs,
    ): Promise<TransactionModel> {
        return await this.mergeTokensTransactions.depositTokens(args);
    }

    @UseGuards(JwtAuthenticateGuard)
    @Query(returns => TransactionModel)
    async withdrawAllTokensFromDeposit(
        @Args() args: TokensMergingArgs,
    ): Promise<TransactionModel> {
        return await this.mergeTokensTransactions.withdrawAllTokensFromDeposit(
            args,
        );
    }

    @UseGuards(JwtAuthenticateGuard)
    @Query(returns => TransactionModel)
    async withdrawTokenFromDeposit(
        @Args() args: WithdrawTokenFromDepositArgs,
    ): Promise<TransactionModel> {
        return await this.mergeTokensTransactions.withdrawTokenFromDeposit(
            args,
        );
    }
}
