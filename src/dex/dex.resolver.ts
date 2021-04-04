import { DexService } from './dex.service';
import { Resolver, Query, ResolveField, Parent, Args } from '@nestjs/graphql';
import { Inject } from '@nestjs/common';
import { PairModel, PairPriceModel, TransactionModel } from './dex.model';
import { Transaction } from "@elrondnetwork/erdjs";

@Resolver()
export class DexResolver {
  constructor(
    @Inject(DexService) private dexService: DexService,
  ) { }

  @Query(returns => [PairModel])
  async pairs(): Promise<PairModel[]> {
    return await this.dexService.getAllPairs();
  }

  @Query(returns => TransactionModel)
  async createPair(
    @Args('token_a') token_a: string,
    @Args('token_b') token_b: string
  ): Promise<TransactionModel> {
    return await this.dexService.createPair(token_a, token_b);
  }

  @Query(returns => TransactionModel)
  async issueLPToken(
    @Args('address') address: string,
    @Args('lpTokenName') lpTokenName: string,
    @Args('lpTokenTicker') lpTokenTicker: string
  ): Promise<TransactionModel> {
    return await this.dexService.issueLpToken(address, lpTokenName, lpTokenTicker);
  }

  @Query(returns => TransactionModel)
  async addLiquidity(
    @Args('address') address: string,
    @Args('amount0') amount0: number,
    @Args('amount1') amount1: number,
    @Args('amount0Min') amount0Min: number,
    @Args('amount1Min') amount1Min: number,
  ): Promise<TransactionModel> {
    return await this.dexService.addLiquidity(address, amount0, amount1, amount0Min, amount1Min);
  }

  @Query(returns => TransactionModel)
  async removeLiquidity(
    @Args('address') address: string,
    @Args('liquidity') liqidity: number,
    @Args('tokenID') tokenID: string,
    @Args('amount0Min') amount0Min: number,
    @Args('amount1Min') amount1Min: number,
  ): Promise<TransactionModel> {
    return await this.dexService.removeLiquidity(address, liqidity, tokenID, amount0Min, amount1Min);
  }

  @Query(returns => TransactionModel)
  async swapTokensFixedInput(
    @Args('address') address: string,
    @Args('tokenIn') tokenIn: string,
    @Args('amountIn') amountIn: number,
    @Args('tokenOut') tokenOut: string,
    @Args('amountOutMin') amountOutMin: number,
  ): Promise<TransactionModel> {
    return await this.dexService.swapTokensFixedInput(address, tokenIn, amountIn, tokenOut, amountOutMin);
  }

  @Query(returns => TransactionModel)
  async swapTokensFixedOutput(
    @Args('address') address: string,
    @Args('tokenIn') tokenIn: string,
    @Args('amountInMax') amountInMax: number,
    @Args('tokenOut') tokenOut: string,
    @Args('amountOut') amountOut: number,
  ): Promise<TransactionModel> {
    return await this.dexService.swapTokensFixedOutput(address, tokenIn, amountInMax, tokenOut, amountOut);
  }
}

@Resolver(of => PairModel)
export class PairResolver {
  constructor(
    @Inject(DexService) private dexService: DexService,
  ) { }

  @ResolveField()
  async info(@Parent() pair: PairModel) {
    const { address, token_a, token_b } = pair;
    return this.dexService.getPairInfo(address);
  }

  @ResolveField()
  async price(@Parent() pair: PairModel) {
    const { address, token_a, token_b } = pair;
    let price = new PairPriceModel();
    price.tokena_price = await this.dexService.getAmountOut(address, token_a);
    price.tokenb_price = await this.dexService.getAmountOut(address, token_b);
    return price;
  }

}
