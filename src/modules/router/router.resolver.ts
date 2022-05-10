import { RouterService } from './services/router.service';
import { Resolver, Query, ResolveField, Args, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { TransactionModel } from '../../models/transaction.model';
import { GetPairsArgs, PairModel } from '../pair/models/pair.model';
import { FactoryModel } from './models/factory.model';
import { TransactionRouterService } from './services/transactions.router.service';
import { JwtAdminGuard } from '../auth/jwt.admin.guard';
import { ApolloError } from 'apollo-server-express';
import { RouterGetterService } from './services/router.getter.service';
import { constantsConfig } from 'src/config';
import { PairFilterArgs } from './models/filter.args';
import { GqlAuthGuard } from '../auth/gql.auth.guard';
import { AutoRouteModel } from './models/auto-router.model';
import { AutoRouterService } from './services/auto-router/auto-router.service';

@Resolver(() => FactoryModel)
export class RouterResolver {
    constructor(
        private readonly routerService: RouterService,
        private readonly routerGetterService: RouterGetterService,
        private readonly transactionService: TransactionRouterService,
        private readonly autoRouterService: AutoRouterService,
    ) {}

    @Query(() => FactoryModel)
    async factory() {
        return this.routerService.getFactory();
    }

    @ResolveField(() => Int)
    async pairCount() {
        try {
            return await this.routerService.getPairCount();
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField(() => Int)
    async totalTxCount() {
        try {
            return await this.routerService.getTotalTxCount();
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async totalValueLockedUSD() {
        try {
            return await this.routerGetterService.getTotalLockedValueUSD();
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async totalVolumeUSD24h() {
        try {
            return this.routerGetterService.getTotalVolumeUSD('24h');
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async totalFeesUSD24h() {
        try {
            return this.routerGetterService.getTotalFeesUSD('24h');
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async maintenance() {
        try {
            return constantsConfig.MAINTENANCE;
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @Query(() => [String])
    async pairAddresses(): Promise<string[]> {
        try {
            return await this.routerGetterService.getAllPairsAddress();
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @Query(() => [PairModel])
    async pairs(
        @Args() page: GetPairsArgs,
        @Args() filter: PairFilterArgs,
    ): Promise<PairModel[]> {
        try {
            return await this.routerService.getAllPairs(
                page.offset,
                page.limit,
                filter,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => TransactionModel)
    async createPair(
        @Args('firstTokenID') firstTokenID: string,
        @Args('secondTokenID') secondTokenID: string,
    ): Promise<TransactionModel> {
        return this.transactionService.createPair(firstTokenID, secondTokenID);
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => TransactionModel)
    async issueLPToken(
        @Args('address') address: string,
        @Args('lpTokenName') lpTokenName: string,
        @Args('lpTokenTicker') lpTokenTicker: string,
    ): Promise<TransactionModel> {
        return this.transactionService.issueLpToken(
            address,
            lpTokenName,
            lpTokenTicker,
        );
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => TransactionModel)
    async setLocalRoles(
        @Args('address') address: string,
    ): Promise<TransactionModel> {
        return this.transactionService.setLocalRoles(address);
    }

    @UseGuards(JwtAdminGuard)
    @Query(() => TransactionModel)
    async setState(
        @Args('address') address: string,
        @Args('enable') enable: boolean,
    ): Promise<TransactionModel> {
        return this.transactionService.setState(address, enable);
    }

    @UseGuards(JwtAdminGuard)
    @Query(() => TransactionModel)
    async setFee(
        @Args('pairAddress') pairAddress: string,
        @Args('feeToAddress') feeToAddress: string,
        @Args('feeTokenID') feeTokenID: string,
        @Args('enable') enable: boolean,
    ): Promise<TransactionModel> {
        return this.transactionService.setFee(
            pairAddress,
            feeToAddress,
            feeTokenID,
            enable,
        );
    }

    @Query(() => AutoRouteModel)
    async getAutoRouteFixedInput(
        @Args('amountIn') amountIn: string,
        @Args('tokenInID') tokenInID: string,
        @Args('tokenOutID') tokenOutID: string,
    ): Promise<AutoRouteModel> {
        try {
            return await this.autoRouterService.getAutoRouteFixedInput(
                amountIn,
                tokenInID,
                tokenOutID,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @Query(() => AutoRouteModel)
    async getAutoRouteFixedOutput(
        @Args('amountOut') amountOut: string,
        @Args('tokenInID') tokenInID: string,
        @Args('tokenOutID') tokenOutID: string,
    ): Promise<AutoRouteModel> {
        try {
            return await this.autoRouterService.getAutoRouteFixedOutput(
                amountOut,
                tokenInID,
                tokenOutID,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }
}
