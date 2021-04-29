import { PairService } from './pair.service';
import {
    Resolver,
    Query,
    ResolveField,
    Parent,
    Args,
    Int,
} from '@nestjs/graphql';
import { Inject } from '@nestjs/common';
import { LiquidityPosition, PairModel } from '../models/pair.model';
import { TransactionModel } from '../models/transaction.model';
import { ContextService } from '../utils/context.service';

@Resolver(of => PairModel)
export class PairResolver {
    constructor(
        @Inject(PairService) private pairService: PairService,
        @Inject(ContextService) private context: ContextService,
    ) {}

    @ResolveField()
    async firstToken(@Parent() parent: PairModel) {
        return this.pairService.getPairToken(
            parent.address,
            this.firstToken.name,
        );
    }

    @ResolveField()
    async secondToken(@Parent() parent: PairModel) {
        return this.pairService.getPairToken(
            parent.address,
            this.secondToken.name,
        );
    }

    @ResolveField()
    async liquidityPoolToken(@Parent() parent: PairModel) {
        return this.pairService.getLpToken(parent.address);
    }

    @ResolveField()
    async info(@Parent() pair: PairModel) {
        const { address } = pair;
        return this.pairService.getPairInfo(address);
    }

    @ResolveField()
    async price(@Parent() parent: PairModel) {
        return this.pairService.getPairPrice(parent.address);
    }

    @ResolveField()
    async state(@Parent() parent: PairModel) {
        return this.pairService.getPairState(parent.address);
    }

    @Query(returns => String)
    async getAmountOut(
        @Args('pairAddress') pairAddress: string,
        @Args('tokenInID') tokenInID: string,
        @Args('amount') amount: string,
    ) {
        return this.pairService.getAmountOut(pairAddress, tokenInID, amount);
    }

    @Query(returns => String)
    async getAmountIn(
        @Args('pairAddress') pairAddress: string,
        @Args('tokenOutID') tokenOutID: string,
        @Args('amount') amount: string,
    ) {
        return this.pairService.getAmountIn(pairAddress, tokenOutID, amount);
    }

    @Query(returns => String)
    async getEquivalent(
        @Args('pairAddress') pairAddress: string,
        @Args('tokenInID') tokenInID: string,
        @Args('amount') amount: string,
    ) {
        return this.pairService.getEquivalentForLiquidity(
            pairAddress,
            tokenInID,
            amount,
        );
    }

    @Query(returns => String)
    async getTemporaryFunds(
        @Args('pairAddress') pairAddress: string,
        @Args('callerAddress') callerAddress: string,
        @Args('tokenID') tokenID: string,
    ) {
        return this.pairService.getTemporaryFunds(
            pairAddress,
            callerAddress,
            tokenID,
        );
    }

    @Query(returns => LiquidityPosition)
    async getLiquidityPosition(
        @Args('pairAddress') pairAddress: string,
        @Args('liquidityAmount') liquidityAmount: string,
    ) {
        return this.pairService.getLiquidityPosition(
            pairAddress,
            liquidityAmount,
        );
    }

    @Query(returns => TransactionModel)
    async addLiquidity(
        @Args('pairAddress') pairAddress: string,
        @Args('amount0') amount0: string,
        @Args('amount1') amount1: string,
        @Args('tolerance') tolerance: number,
    ): Promise<TransactionModel> {
        return this.pairService.addLiquidity(
            pairAddress,
            amount0,
            amount1,
            tolerance,
        );
    }

    @Query(returns => TransactionModel)
    async reclaimTemporaryFunds(
        @Args('pairAddress') pairAddress: string,
    ): Promise<TransactionModel> {
        return this.pairService.reclaimTemporaryFunds(pairAddress);
    }

    @Query(returns => TransactionModel)
    async removeLiquidity(
        @Args('pairAddress') pairAddress: string,
        @Args('liquidity') liqidity: string,
        @Args('liquidityTokenID') liquidityTokenID: string,
        @Args('tolerance') tolerance: number,
    ): Promise<TransactionModel> {
        return this.pairService.removeLiquidity(
            pairAddress,
            liqidity,
            liquidityTokenID,
            tolerance,
        );
    }

    @Query(returns => TransactionModel)
    async swapTokensFixedInput(
        @Args('pairAddress') pairAddress: string,
        @Args('tokenInID') tokenInID: string,
        @Args('amountIn') amountIn: string,
        @Args('tokenOutID') tokenOutID: string,
        @Args('amountOut') amountOut: string,
        @Args('tolerance') tolerance: number,
    ): Promise<TransactionModel> {
        return this.pairService.swapTokensFixedInput(
            pairAddress,
            tokenInID,
            amountIn,
            tokenOutID,
            amountOut,
            tolerance,
        );
    }

    @Query(returns => TransactionModel)
    async swapTokensFixedOutput(
        @Args('pairAddress') pairAddress: string,
        @Args('tokenInID') tokenInID: string,
        @Args('amountIn') amountIn: string,
        @Args('tokenOutID') tokenOutID: string,
        @Args('amountOut') amountOut: string,
        @Args('tolerance') tolerance: number,
    ): Promise<TransactionModel> {
        return this.pairService.swapTokensFixedOutput(
            pairAddress,
            tokenInID,
            amountIn,
            tokenOutID,
            amountOut,
            tolerance,
        );
    }

    @Query(returns => TransactionModel)
    async tokensTransfer(
        @Args('pairAddress') pairAddress: string,
        @Args('token') token: string,
        @Args('amount') amount: string,
    ): Promise<TransactionModel> {
        return this.pairService.esdtTransfer(pairAddress, token, amount);
    }
}
