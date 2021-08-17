import { Resolver, Query, ResolveField, Args } from '@nestjs/graphql';
import { Inject, UseGuards } from '@nestjs/common';
import { TransactionModel } from '../../models/transaction.model';
import { EsdtToken } from '../../models/tokens/esdtToken.model';
import { WrapModel } from './models/wrapping.model';
import { WrapService } from './wrap.service';
import { TransactionsWrapService } from './transactions-wrap.service';
import { JwtAuthenticateGuard } from '../../helpers/guards/jwt.authenticate.guard';
import { ApolloError } from 'apollo-server-express';

@Resolver(of => WrapModel)
export class WrapResolver {
    constructor(
        @Inject(WrapService)
        private wrapService: WrapService,
        @Inject(TransactionsWrapService)
        private transactionService: TransactionsWrapService,
    ) {}

    @ResolveField()
    async wrappedToken(): Promise<EsdtToken> {
        try {
            return this.wrapService.getWrappedEgldToken();
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @Query(returns => [WrapModel])
    async wrappingInfo(): Promise<WrapModel[]> {
        return this.wrapService.getWrappingInfo();
    }

    @UseGuards(JwtAuthenticateGuard)
    @Query(returns => TransactionModel)
    async wrapEgld(
        @Args('sender') sender: string,
        @Args('amount') amount: string,
    ): Promise<TransactionModel> {
        return this.transactionService.wrapEgld(sender, amount);
    }

    @UseGuards(JwtAuthenticateGuard)
    @Query(returns => TransactionModel)
    async unwrapEgld(
        @Args('sender') sender: string,
        @Args('amount') amount: string,
    ): Promise<TransactionModel> {
        return this.transactionService.unwrapEgld(sender, amount);
    }
}
