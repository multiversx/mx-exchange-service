import { Resolver, Query, ResolveField, Args } from '@nestjs/graphql';
import { Inject, UseGuards } from '@nestjs/common';
import { TransactionModel } from '../../models/transaction.model';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import { WrapModel } from './models/wrapping.model';
import { WrapService } from './wrap.service';
import { TransactionsWrapService } from './transactions-wrap.service';
import { ApolloError } from 'apollo-server-express';
import { GqlAuthGuard } from '../auth/gql.auth.guard';
import { AuthUser } from '../auth/auth.user';
import { UserAuthResult } from '../auth/user.auth.result';

@Resolver(() => WrapModel)
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
            return await this.wrapService.getWrappedEgldToken();
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @Query(() => [WrapModel])
    async wrappingInfo(): Promise<WrapModel[]> {
        return this.wrapService.getWrappingInfo();
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => TransactionModel)
    async wrapEgld(
        @Args('amount') amount: string,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        return this.transactionService.wrapEgld(user.address, amount);
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => TransactionModel)
    async unwrapEgld(
        @Args('amount') amount: string,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        return this.transactionService.unwrapEgld(user.address, amount);
    }
}
