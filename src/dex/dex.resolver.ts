import { DexService } from './dex.service';
import { Resolver, Query, Args } from '@nestjs/graphql';
import { Inject } from '@nestjs/common';
import { TransactionModel } from './dex.model';


@Resolver()
export class DexResolver {
  constructor(
    @Inject(DexService) private dexService: DexService,
  ) { }


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
  async esdtTransfer(
    @Args('address') address: string,
    @Args('token') token: string,
    @Args('amount') amount: number,
  ): Promise<TransactionModel> {
    return await this.dexService.esdtTransfer(address, token, amount);
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
