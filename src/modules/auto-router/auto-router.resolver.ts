import { Resolver, Query, ResolveField, Args, Parent } from '@nestjs/graphql';
import { AutoRouterService } from '../auto-router/services/auto-router.service';
import { AutoRouterArgs } from '../auto-router/models/auto-router.args';
import { AutoRouteModel, SwapRouteModel } from './models/auto-route.model';
import { TransactionModel } from 'src/models/transaction.model';
import { UseGuards } from '@nestjs/common';
import { AuthUser } from '../auth/auth.user';
import { UserAuthResult } from '../auth/user.auth.result';
import { JwtOrNativeAuthGuard } from '../auth/jwt.or.native.auth.guard';
import { GraphQLError } from 'graphql';
import { ApolloServerErrorCode } from '@apollo/server/errors';

@Resolver(() => SwapRouteModel)
export class SwapRouteResolver {
    constructor(protected readonly autoRouterService: AutoRouterService) {}

    @ResolveField(() => [String])
    fees(parent: AutoRouteModel): string[] {
        const fees = this.autoRouterService.getFeesDenom(
            parent.intermediaryAmounts,
            parent.tokenRoute,
            parent.pairs,
        );

        return fees;
    }

    @ResolveField(() => [String])
    pricesImpact(parent: AutoRouteModel): string[] {
        return this.autoRouterService.getPriceImpactPercents(
            parent.intermediaryAmounts,
            parent.tokenRoute,
            parent.pairs,
        );
    }
}

@Resolver(() => AutoRouteModel)
export class AutoRouterResolver extends SwapRouteResolver {
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
