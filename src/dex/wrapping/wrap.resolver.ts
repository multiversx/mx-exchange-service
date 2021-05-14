import { Resolver, Query, ResolveField, Args } from '@nestjs/graphql';
import { Inject } from '@nestjs/common';
import { TransactionModel } from '../models/transaction.model';
import { TokenModel } from '../models/pair.model';
import { WrapModel } from '../models/wrapping.model';
import { WrapService } from './wrap.service';
import { TransactionsWrapService } from './transactions-wrap.service';

@Resolver(of => WrapModel)
export class WrapResolver {
    constructor(
        @Inject(WrapService)
        private wrapService: WrapService,
        @Inject(TransactionsWrapService)
        private transactionService: TransactionsWrapService,
    ) {}

    @ResolveField()
    async wrappedToken(): Promise<TokenModel> {
        return this.wrapService.getWrappedEgldToken();
    }

    @Query(returns => WrapModel)
    async wrappingInfo(): Promise<WrapModel> {
        return this.wrapService.getWrappingInfo();
    }

    @Query(returns => TransactionModel)
    async wrapEgld(@Args('amount') amount: string): Promise<TransactionModel> {
        return this.transactionService.wrapEgld(amount);
    }

    @Query(returns => TransactionModel)
    async unwrapEgld(
        @Args('amount') amount: string,
    ): Promise<TransactionModel> {
        return this.transactionService.unwrapEgld(amount);
    }
}
