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
        return await this.pairService.getPairInfoMetadata(address);
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

    @UseGuards(JwtAuthenticateGuard)
    @Query(returns => [TemporaryFundsModel])
    async getTemporaryFunds(@Args('callerAddress') callerAddress: string) {
        return await this.pairService.getTemporaryFunds(callerAddress);
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
