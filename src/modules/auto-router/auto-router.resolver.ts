import { Resolver, Query, ResolveField, Args, Parent } from '@nestjs/graphql';
import { ApolloError } from 'apollo-server-express';
import { AutoRouterService } from '../auto-router/services/auto-router.service';
import { AutoRouterArgs } from '../auto-router/models/auto-router.args';
import { AutoRouteModel } from './models/auto-route.model';
import { TransactionModel } from 'src/models/transaction.model';
import { UseGuards } from '@nestjs/common';
import { User } from 'src/helpers/userDecorator';
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
        return this.autoRouterService.calculateFeesDenom(
            parent.intermediaryAmounts,
            parent.tokenRoute,
            parent.pairs,
        );
    }

    @ResolveField(() => [String])
    pricesImpact(@Parent() parent: AutoRouteModel): string[] {
        return this.autoRouterService.calculatePriceImpactPercents(
            parent.intermediaryAmounts,
            parent.tokenRoute,
            parent.pairs,
        );
    }

    @UseGuards(GqlAuthGuard)
    @ResolveField(() => [TransactionModel])
    async transactions(@Parent() parent: AutoRouteModel, @User() user: any) {
        try {
            return await this.autoRouterService.getTransactions(
                user.publicKey,
                parent,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }
}
