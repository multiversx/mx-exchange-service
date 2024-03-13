import { Resolver, Query, ResolveField, Args, Parent } from '@nestjs/graphql';
import { AutoRouterService } from '../auto-router/services/auto-router.service';
import { AutoRouterArgs } from '../auto-router/models/auto-router.args';
import { AutoRouteModel } from './models/auto-route.model';
import { TransactionModel } from 'src/models/transaction.model';
import { UseGuards } from '@nestjs/common';
import { AuthUser } from '../auth/auth.user';
import { UserAuthResult } from '../auth/user.auth.result';
import { JwtOrNativeAuthGuard } from '../auth/jwt.or.native.auth.guard';
import { GraphQLError } from 'graphql';
import { ApolloServerErrorCode } from '@apollo/server/errors';

@Resolver(() => AutoRouteModel)
export class AutoRouterResolver {
    constructor(private readonly autoRouterService: AutoRouterService) {}

    @Query(() => AutoRouteModel)
    async swap(@Args() args: AutoRouterArgs): Promise<AutoRouteModel> {
        try {
            return await this.autoRouterService.swap(args);
        } catch (error) {
            if (error.status === 400) {
                throw new GraphQLError(error.message, {
                    extensions: {
                        code: ApolloServerErrorCode.BAD_USER_INPUT,
                    },
                });
            }
            throw new GraphQLError(error.message, {
                extensions: {
                    code: ApolloServerErrorCode.INTERNAL_SERVER_ERROR,
                },
            });
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

    @UseGuards(JwtOrNativeAuthGuard)
    @ResolveField(() => [TransactionModel])
    async transactions(
        @Parent() parent: AutoRouteModel,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel[]> {
        try {
            return await this.autoRouterService.getTransactions(
                user.address,
                parent,
            );
        } catch (error) {
            throw new GraphQLError(error.message, {
                extensions: {
                    code: ApolloServerErrorCode.INTERNAL_SERVER_ERROR,
                },
            });
        }
    }

    @ResolveField(() => [TransactionModel])
    async noAuthTransactions(
        @Parent() parent: AutoRouteModel,
        @Args('sender') sender: string,
    ) {
        try {
            return await this.autoRouterService.getTransactions(sender, parent);
        } catch (error) {
            throw new GraphQLError(error.message, {
                extensions: {
                    code: ApolloServerErrorCode.INTERNAL_SERVER_ERROR,
                },
            });
        }
    }
}
