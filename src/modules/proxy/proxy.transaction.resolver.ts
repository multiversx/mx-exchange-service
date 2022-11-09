import { Args, Query, Resolver } from '@nestjs/graphql';
import { TransactionsProxyFarmService } from './services/proxy-farm/proxy-farm-transactions.service';
import { TransactionsProxyPairService } from './services/proxy-pair/proxy-pair-transactions.service';
import {
    AddLiquidityProxyArgs,
    RemoveLiquidityProxyArgs,
} from './models/proxy-pair.args';
import {
    ClaimFarmRewardsProxyArgs,
    CompoundRewardsProxyArgs,
    EnterFarmProxyArgs,
    ExitFarmProxyArgs,
} from './models/proxy-farm.args';
import { WrappedLpValidationPipe } from './validators/wrapped.lp.validator';
import { MergeWrappedTokenValidationPipe } from './validators/merge.wrapped.token.validator';
import { EnterFarmProxyValidationPipe } from './validators/enter.farm.proxy.valodator';
import { WrappedFarmValidationPipe } from './validators/wrapped.farm.token.validator';
import { UseGuards } from '@nestjs/common';
import { TransactionModel } from '../../models/transaction.model';
import { GqlAuthGuard } from '../auth/gql.auth.guard';
import { User } from 'src/helpers/userDecorator';
import { InputTokenModel } from 'src/models/inputToken.model';
import { LiquidityTokensValidationPipe } from './validators/add.liquidity.input.validator';
import { ApolloError } from 'apollo-server-express';
import { ProxyService } from './services/proxy.service';
import { scAddress } from 'src/config';

@Resolver()
export class ProxyTransactionResolver {
    constructor(
        private readonly proxyService: ProxyService,
        private readonly transactionsProxyPairService: TransactionsProxyPairService,
        private readonly transactionsProxyFarmService: TransactionsProxyFarmService,
    ) {}

    @UseGuards(GqlAuthGuard)
    @Query(() => [TransactionModel])
    async addLiquidityProxyBatch(
        @Args(LiquidityTokensValidationPipe) args: AddLiquidityProxyArgs,
        @User() user: any,
    ): Promise<TransactionModel[]> {
        try {
            return await this.transactionsProxyPairService.addLiquidityProxyBatch(
                user.publicKey,
                scAddress.proxyDexAddress.v2,
                args,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => TransactionModel)
    async addLiquidityProxy(
        @Args(LiquidityTokensValidationPipe) args: AddLiquidityProxyArgs,
        @User() user: any,
    ): Promise<TransactionModel> {
        try {
            return await this.transactionsProxyPairService.addLiquidityProxy(
                user.publicKey,
                scAddress.proxyDexAddress.v2,
                args,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => [TransactionModel])
    async removeLiquidityProxy(
        @Args(WrappedLpValidationPipe) args: RemoveLiquidityProxyArgs,
        @User() user: any,
    ): Promise<TransactionModel[]> {
        const proxyAddress = await this.proxyService.getProxyAddressByToken(
            args.wrappedLpTokenID,
        );
        return await this.transactionsProxyPairService.removeLiquidityProxy(
            user.publicKey,
            proxyAddress,
            args,
        );
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => TransactionModel)
    async enterFarmProxy(
        @Args(EnterFarmProxyValidationPipe) args: EnterFarmProxyArgs,
        @User() user: any,
    ): Promise<TransactionModel> {
        try {
            return await this.transactionsProxyFarmService.enterFarmProxy(
                user.publicKey,
                scAddress.proxyDexAddress.v2,
                args,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => TransactionModel)
    async exitFarmProxy(
        @Args(WrappedFarmValidationPipe) args: ExitFarmProxyArgs,
        @User() user: any,
    ): Promise<TransactionModel> {
        const proxyAddress = await this.proxyService.getProxyAddressByToken(
            args.wrappedFarmTokenID,
        );
        return await this.transactionsProxyFarmService.exitFarmProxy(
            user.publicKey,
            proxyAddress,
            args,
        );
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => TransactionModel)
    async claimFarmRewardsProxy(
        @Args(WrappedFarmValidationPipe) args: ClaimFarmRewardsProxyArgs,
        @User() user: any,
    ): Promise<TransactionModel> {
        const proxyAddress = await this.proxyService.getProxyAddressByToken(
            args.wrappedFarmTokenID,
        );
        return await this.transactionsProxyFarmService.claimFarmRewardsProxy(
            user.publicKey,
            proxyAddress,
            args,
        );
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => TransactionModel)
    async mergeWrappedLpTokens(
        @Args(
            'tokens',
            { type: () => [InputTokenModel] },
            MergeWrappedTokenValidationPipe,
        )
        tokens: InputTokenModel[],
        @User() user: any,
    ): Promise<TransactionModel> {
        try {
            const proxyAddress = await this.proxyService.getProxyAddressByToken(
                tokens[0].tokenID,
            );
            return await this.transactionsProxyPairService.mergeWrappedLPTokens(
                user.publicKey,
                proxyAddress,
                tokens,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => TransactionModel)
    async mergeWrappedFarmTokens(
        @Args('farmAddress') farmAddress: string,
        @Args(
            'tokens',
            { type: () => [InputTokenModel] },
            MergeWrappedTokenValidationPipe,
        )
        tokens: InputTokenModel[],
        @User() user: any,
    ): Promise<TransactionModel> {
        try {
            const proxyAddress = await this.proxyService.getProxyAddressByToken(
                tokens[0].tokenID,
            );
            return await this.transactionsProxyFarmService.mergeWrappedFarmTokens(
                user.publicKey,
                proxyAddress,
                farmAddress,
                tokens,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => TransactionModel)
    async compoundRewardsProxy(
        @Args(WrappedFarmValidationPipe) args: CompoundRewardsProxyArgs,
        @User() user: any,
    ): Promise<TransactionModel> {
        const proxyAddress = await this.proxyService.getProxyAddressByToken(
            args.tokenID,
        );
        return await this.transactionsProxyFarmService.compoundRewardsProxy(
            user.publicKey,
            proxyAddress,
            args,
        );
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => TransactionModel)
    async migrateToNewFarmProxy(
        @Args(WrappedFarmValidationPipe) args: ExitFarmProxyArgs,
        @User() user: any,
    ): Promise<TransactionModel> {
        const proxyAddress = await this.proxyService.getProxyAddressByToken(
            args.wrappedFarmTokenID,
        );
        return await this.transactionsProxyFarmService.migrateToNewFarmProxy(
            user.publicKey,
            proxyAddress,
            args,
        );
    }
}
