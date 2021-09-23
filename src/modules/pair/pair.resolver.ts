import { PairService } from './pair.service';
import { Resolver, Query, ResolveField, Parent, Args } from '@nestjs/graphql';
import { Inject, UseGuards } from '@nestjs/common';
import {
    LiquidityPosition,
    PairModel,
    TemporaryFundsModel,
} from './models/pair.model';
import { TransactionModel } from '../../models/transaction.model';
import {
    AddLiquidityArgs,
    AddLiquidityBatchArgs,
    ESDTTransferArgs,
    ReclaimTemporaryFundsArgs,
    RemoveLiquidityArgs,
    SwapTokensFixedInputArgs,
    SwapTokensFixedOutputArgs,
} from './models/pair.args';
import { TransactionPairService } from './transactions-pair.service';
import { JwtAuthenticateGuard } from '../../helpers/guards/jwt.authenticate.guard';
import { ApolloError } from 'apollo-server-express';

@Resolver(of => PairModel)
export class PairResolver {
    constructor(
        @Inject(PairService) private pairService: PairService,
        @Inject(TransactionPairService)
        private transactionService: TransactionPairService,
    ) {}

    @ResolveField()
    async firstToken(@Parent() parent: PairModel) {
        try {
            return await this.pairService.getFirstToken(parent.address);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async secondToken(@Parent() parent: PairModel) {
        try {
            return await this.pairService.getSecondToken(parent.address);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async liquidityPoolToken(@Parent() parent: PairModel) {
        try {
            return await this.pairService.getLpToken(parent.address);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async firstTokenPrice(@Parent() parent: PairModel) {
        try {
            return await this.pairService.getFirstTokenPrice(parent.address);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async firstTokenPriceUSD(@Parent() parent: PairModel) {
        try {
            return await this.pairService.getFirstTokenPriceUSD(parent.address);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async secondTokenPriceUSD(@Parent() parent: PairModel) {
        try {
            return await this.pairService.getSecondTokenPriceUSD(
                parent.address,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async secondTokenPrice(@Parent() parent: PairModel) {
        try {
            return await this.pairService.getSecondTokenPrice(parent.address);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async liquidityPoolTokenPriceUSD(@Parent() parent: PairModel) {
        try {
            return await this.pairService.getLpTokenPriceUSD(parent.address);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async info(@Parent() pair: PairModel) {
        const { address } = pair;
        try {
            return await this.pairService.getPairInfoMetadata(address);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async totalFeePercent(@Parent() parent: PairModel) {
        try {
            return await this.pairService.getTotalFeePercent(parent.address);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async state(@Parent() parent: PairModel) {
        try {
            return await this.pairService.getState(parent.address);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @Query(returns => String)
    async getAmountOut(
        @Args('pairAddress') pairAddress: string,
        @Args('tokenInID') tokenInID: string,
        @Args('amount') amount: string,
    ) {
        try {
            return await this.pairService.getAmountOut(
                pairAddress,
                tokenInID,
                amount,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @Query(returns => String)
    async getAmountIn(
        @Args('pairAddress') pairAddress: string,
        @Args('tokenOutID') tokenOutID: string,
        @Args('amount') amount: string,
    ) {
        try {
            return await this.pairService.getAmountIn(
                pairAddress,
                tokenOutID,
                amount,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @Query(returns => String)
    async getEquivalent(
        @Args('pairAddress') pairAddress: string,
        @Args('tokenInID') tokenInID: string,
        @Args('amount') amount: string,
    ) {
        try {
            return await this.pairService.getEquivalentForLiquidity(
                pairAddress,
                tokenInID,
                amount,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(JwtAuthenticateGuard)
    @Query(returns => [TemporaryFundsModel])
    async getTemporaryFunds(@Args('callerAddress') callerAddress: string) {
        try {
            return await this.pairService.getTemporaryFunds(callerAddress);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @Query(returns => LiquidityPosition)
    async getLiquidityPosition(
        @Args('pairAddress') pairAddress: string,
        @Args('liquidityAmount') liquidityAmount: string,
    ) {
        try {
            return await this.pairService.getLiquidityPosition(
                pairAddress,
                liquidityAmount,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(JwtAuthenticateGuard)
    @Query(returns => [TransactionModel])
    async addLiquidityBatch(
        @Args() args: AddLiquidityBatchArgs,
    ): Promise<TransactionModel[]> {
        return await this.transactionService.addLiquidityBatch(args);
    }

    @UseGuards(JwtAuthenticateGuard)
    @Query(returns => TransactionModel)
    async addLiquidity(
        @Args() args: AddLiquidityArgs,
    ): Promise<TransactionModel> {
        return await this.transactionService.addLiquidity(args);
    }

    @UseGuards(JwtAuthenticateGuard)
    @Query(returns => [TransactionModel])
    async reclaimTemporaryFunds(
        @Args() args: ReclaimTemporaryFundsArgs,
    ): Promise<TransactionModel[]> {
        return await this.transactionService.reclaimTemporaryFunds(args);
    }

    @UseGuards(JwtAuthenticateGuard)
    @Query(returns => [TransactionModel])
    async removeLiquidity(
        @Args() args: RemoveLiquidityArgs,
    ): Promise<TransactionModel[]> {
        return await this.transactionService.removeLiquidity(args);
    }

    @UseGuards(JwtAuthenticateGuard)
    @Query(returns => [TransactionModel])
    async swapTokensFixedInput(
        @Args() args: SwapTokensFixedInputArgs,
    ): Promise<TransactionModel[]> {
        return await this.transactionService.swapTokensFixedInput(args);
    }

    @UseGuards(JwtAuthenticateGuard)
    @Query(returns => [TransactionModel])
    async swapTokensFixedOutput(
        @Args() args: SwapTokensFixedOutputArgs,
    ): Promise<TransactionModel[]> {
        return await this.transactionService.swapTokensFixedOutput(args);
    }

    @UseGuards(JwtAuthenticateGuard)
    @Query(returns => TransactionModel)
    async tokensTransfer(
        @Args() args: ESDTTransferArgs,
    ): Promise<TransactionModel> {
        return await this.transactionService.esdtTransfer(args);
    }
}
