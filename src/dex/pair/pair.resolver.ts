import { PairService } from './pair.service';
import { Resolver, Query, ResolveField, Parent, Args } from '@nestjs/graphql';
import { Inject } from '@nestjs/common';
import { LiquidityPosition, PairModel } from '../models/pair.model';
import { TransactionModel } from '../models/transaction.model';
import {
    AddLiquidityArgs,
    ESDTTransferArgs,
    RemoveLiquidityArgs,
    SwapTokensFixedInputArgs,
    SwapTokensFixedOutputArgs,
} from './dto/pair.args';
import { TransactionPairService } from './transactions-pair.service';

@Resolver(of => PairModel)
export class PairResolver {
    constructor(
        @Inject(PairService) private pairService: PairService,
        @Inject(TransactionPairService)
        private transactionService: TransactionPairService,
    ) {}

    @ResolveField()
    async firstToken(@Parent() parent: PairModel) {
        return this.pairService.getFirstToken(parent.address);
    }

    @ResolveField()
    async secondToken(@Parent() parent: PairModel) {
        return this.pairService.getSecondToken(parent.address);
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
    async state(@Parent() parent: PairModel) {
        return this.pairService.getState(parent.address);
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
        @Args() args: AddLiquidityArgs,
    ): Promise<TransactionModel> {
        return this.transactionService.addLiquidity(args);
    }

    @Query(returns => TransactionModel)
    async reclaimTemporaryFunds(
        @Args('pairAddress') pairAddress: string,
    ): Promise<TransactionModel> {
        return this.transactionService.reclaimTemporaryFunds(pairAddress);
    }

    @Query(returns => TransactionModel)
    async removeLiquidity(
        @Args() args: RemoveLiquidityArgs,
    ): Promise<TransactionModel> {
        return this.transactionService.removeLiquidity(args);
    }

    @Query(returns => TransactionModel)
    async swapTokensFixedInput(
        @Args() args: SwapTokensFixedInputArgs,
    ): Promise<TransactionModel> {
        return this.transactionService.swapTokensFixedInput(args);
    }

    @Query(returns => TransactionModel)
    async swapTokensFixedOutput(
        @Args() args: SwapTokensFixedOutputArgs,
    ): Promise<TransactionModel> {
        return this.transactionService.swapTokensFixedOutput(args);
    }

    @Query(returns => TransactionModel)
    async tokensTransfer(
        @Args() args: ESDTTransferArgs,
    ): Promise<TransactionModel> {
        return this.transactionService.esdtTransfer(args);
    }
}
