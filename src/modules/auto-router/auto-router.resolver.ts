import { Resolver, Query, ResolveField, Args, Parent } from '@nestjs/graphql';
import { ApolloError } from 'apollo-server-express';
import { AutoRouterService } from '../auto-router/services/auto-router.service';
import { AutoRouterArgs } from '../auto-router/models/auto-router.args';
import { AutoRouteModel } from './models/auto-route.model';
import { TransactionModel } from 'src/models/transaction.model';
import { UseGuards } from '@nestjs/common';
import { AuthUser } from '../auth/auth.user';
import { UserAuthResult } from '../auth/user.auth.result';
import { GqlAuthGuard } from '../auth/gql.auth.guard';

@Resolver(() => AutoRouteModel)
export class AutoRouterResolver {
    constructor(private readonly autoRouterService: AutoRouterService) {}

    @Query(() => AutoRouteModel)
    async swap(@Args() args: AutoRouterArgs): Promise<AutoRouteModel> {
        try {
            return await this.autoRouterService.swap(args);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField(() => [String])
    fees(@Parent() parent: AutoRouteModel): string[] {
        return this.autoRouterService.getFeesDenom(
            parent.intermediaryAmounts,
            parent.tokenRoute,
            parent.pairs,
        );
    }

    @ResolveField(() => [String])
    pricesImpact(@Parent() parent: AutoRouteModel): string[] {
        return this.autoRouterService.getPriceImpactPercents(
            parent.intermediaryAmounts,
            parent.tokenRoute,
            parent.pairs,
        );
    }

    @UseGuards(GqlAuthGuard)
    @ResolveField(() => [TransactionModel])
    async transactions(
        @Parent() parent: AutoRouteModel,
        @AuthUser() user: UserAuthResult,
    ) {
        try {
            return await this.autoRouterService.getTransactions(
                user.address,
                parent,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }
}
