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
        return await this.pairService.getFirstToken(parent.address);
    }

    @ResolveField()
    async secondToken(@Parent() parent: PairModel) {
        return await this.pairService.getSecondToken(parent.address);
    }

    @ResolveField()
    async liquidityPoolToken(@Parent() parent: PairModel) {
        return await this.pairService.getLpToken(parent.address);
    }

    @ResolveField()
    async firstTokenPrice(@Parent() parent: PairModel) {
        return await this.pairService.getFirstTokenPrice(parent.address);
    }

    @ResolveField()
    async firstTokenPriceUSD(@Parent() parent: PairModel) {
        return await this.pairService.getFirstTokenPriceUSD(parent.address);
    }

    @ResolveField()
    async secondTokenPriceUSD(@Parent() parent: PairModel) {
        return await this.pairService.getSecondTokenPriceUSD(parent.address);
    }

    @ResolveField()
    async secondTokenPrice(@Parent() parent: PairModel) {
        return await this.pairService.getSecondTokenPrice(parent.address);
    }

    @ResolveField()
    async liquidityPoolTokenPriceUSD(@Parent() parent: PairModel) {
        return await this.pairService.getLpTokenPriceUSD(parent.address);
    }

    @ResolveField()
    async info(@Parent() pair: PairModel) {
        const { address } = pair;
        return await this.pairService.getPairInfo(address);
    }

    @ResolveField()
    async state(@Parent() parent: PairModel) {
        return await this.pairService.getState(parent.address);
    }

    @Query(returns => String)
    async getAmountOut(
        @Args('pairAddress') pairAddress: string,
        @Args('tokenInID') tokenInID: string,
        @Args('amount') amount: string,
    ) {
        return await this.pairService.getAmountOut(
            pairAddress,
            tokenInID,
            amount,
        );
    }

    @Query(returns => String)
    async getAmountIn(
        @Args('pairAddress') pairAddress: string,
        @Args('tokenOutID') tokenOutID: string,
        @Args('amount') amount: string,
    ) {
        return await this.pairService.getAmountIn(
            pairAddress,
            tokenOutID,
            amount,
        );
    }

    @Query(returns => String)
    async getEquivalent(
        @Args('pairAddress') pairAddress: string,
        @Args('tokenInID') tokenInID: string,
        @Args('amount') amount: string,
    ) {
        return await this.pairService.getEquivalentForLiquidity(
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
        return await this.pairService.getTemporaryFunds(
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
        return await this.pairService.getLiquidityPosition(
            pairAddress,
            liquidityAmount,
        );
    }

    @Query(returns => TransactionModel)
    async addLiquidity(
        @Args() args: AddLiquidityArgs,
    ): Promise<TransactionModel> {
        return await this.transactionService.addLiquidity(args);
    }

    @Query(returns => TransactionModel)
    async reclaimTemporaryFunds(
        @Args('pairAddress') pairAddress: string,
    ): Promise<TransactionModel> {
        return await this.transactionService.reclaimTemporaryFunds(pairAddress);
    }

    @Query(returns => TransactionModel)
    async removeLiquidity(
        @Args() args: RemoveLiquidityArgs,
    ): Promise<TransactionModel> {
        return await this.transactionService.removeLiquidity(args);
    }

    @Query(returns => TransactionModel)
    async swapTokensFixedInput(
        @Args() args: SwapTokensFixedInputArgs,
    ): Promise<TransactionModel> {
        return await this.transactionService.swapTokensFixedInput(args);
    }

    @Query(returns => TransactionModel)
    async swapTokensFixedOutput(
        @Args() args: SwapTokensFixedOutputArgs,
    ): Promise<TransactionModel> {
        return await this.transactionService.swapTokensFixedOutput(args);
    }

    @Query(returns => TransactionModel)
    async tokensTransfer(
        @Args() args: ESDTTransferArgs,
    ): Promise<TransactionModel> {
        return await this.transactionService.esdtTransfer(args);
    }
}
