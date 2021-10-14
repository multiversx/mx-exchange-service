import { Resolver, Query, ResolveField, Args } from '@nestjs/graphql';
import { Inject, UseGuards } from '@nestjs/common';
import { TransactionModel } from '../../models/transaction.model';
import { EsdtToken } from '../../models/tokens/esdtToken.model';
import { WrapModel } from './models/wrapping.model';
import { WrapService } from './wrap.service';
import { TransactionsWrapService } from './transactions-wrap.service';
import { ApolloError } from 'apollo-server-express';
import { GqlAuthGuard } from '../auth/gql.auth.guard';
import { User } from 'src/helpers/userDecorator';

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

    @UseGuards(GqlAuthGuard)
    @Query(returns => TransactionModel)
    async wrapEgld(
        @Args('amount') amount: string,
        @User() user: any,
    ): Promise<TransactionModel> {
        return this.transactionService.wrapEgld(user.publicKey, amount);
    }

    @UseGuards(GqlAuthGuard)
    @Query(returns => TransactionModel)
    async unwrapEgld(
        @Args('amount') amount: string,
        @User() user: any,
    ): Promise<TransactionModel> {
        return this.transactionService.unwrapEgld(user.publicKey, amount);
    }
}
