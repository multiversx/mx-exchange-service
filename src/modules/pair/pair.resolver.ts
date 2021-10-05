import { PairService } from './services/pair.service';
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
import { PairTransactionService } from './services/pair.transactions.service';
import { JwtAuthenticateGuard } from '../../helpers/guards/jwt.authenticate.guard';
import { ApolloError } from 'apollo-server-express';
import { PairGetterService } from './services/pair.getter.service';

@Resolver(of => PairModel)
export class PairResolver {
    constructor(
        private readonly pairService: PairService,
        private readonly pairGetterService: PairGetterService,
        private readonly transactionService: PairTransactionService,
    ) {}

    @ResolveField()
    async firstToken(@Parent() parent: PairModel) {
        try {
            return this.pairGetterService.getFirstToken(parent.address);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async secondToken(@Parent() parent: PairModel) {
        try {
            return this.pairGetterService.getSecondToken(parent.address);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async liquidityPoolToken(@Parent() parent: PairModel) {
        try {
            return this.pairGetterService.getLpToken(parent.address);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async firstTokenPrice(@Parent() parent: PairModel) {
        try {
            return this.pairGetterService.getFirstTokenPrice(parent.address);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async firstTokenPriceUSD(@Parent() parent: PairModel) {
        try {
            return this.pairGetterService.getFirstTokenPriceUSD(parent.address);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async secondTokenPriceUSD(@Parent() parent: PairModel) {
        try {
            return this.pairGetterService.getSecondTokenPriceUSD(
                parent.address,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async secondTokenPrice(@Parent() parent: PairModel) {
        try {
            return this.pairGetterService.getSecondTokenPrice(parent.address);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async liquidityPoolTokenPriceUSD(@Parent() parent: PairModel) {
        try {
            return this.pairGetterService.getLpTokenPriceUSD(parent.address);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async firstTokenLockedValueUSD(@Parent() parent: PairModel) {
        try {
            return this.pairGetterService.getFirstTokenLockedValueUSD(
                parent.address,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async secondTokenLockedValueUSD(@Parent() parent: PairModel) {
        try {
            return this.pairGetterService.getSecondTokenLockedValueUSD(
                parent.address,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async lockedValueUSD(@Parent() parent: PairModel) {
        try {
            return this.pairGetterService.getLockedValueUSD(parent.address);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async firstTokenVolume(@Parent() parent: PairModel) {
        try {
            return this.pairGetterService.getFirstTokenVolume(parent.address);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async secondTokenVolume(@Parent() parent: PairModel) {
        try {
            return this.pairGetterService.getSecondTokenVolume(parent.address);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async volumeUSD(@Parent() parent: PairModel) {
        try {
            return this.pairGetterService.getVolumeUSD(parent.address);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async feesUSD(@Parent() parent: PairModel) {
        try {
            return this.pairGetterService.getFeesUSD(parent.address);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async info(@Parent() parent: PairModel) {
        try {
            return this.pairGetterService.getPairInfoMetadata(parent.address);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async totalFeePercent(@Parent() parent: PairModel) {
        try {
            return this.pairGetterService.getTotalFeePercent(parent.address);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async specialFeePercent(@Parent() parent: PairModel) {
        try {
            return this.pairGetterService.getSpecialFeePercent(parent.address);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async state(@Parent() parent: PairModel) {
        try {
            return this.pairGetterService.getState(parent.address);
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
            return this.pairService.getAmountOut(
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
            return this.pairService.getAmountIn(
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
            return this.pairService.getEquivalentForLiquidity(
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
            return this.pairService.getTemporaryFunds(callerAddress);
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
            return this.pairService.getLiquidityPosition(
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
        return this.transactionService.addLiquidityBatch(args);
    }

    @UseGuards(JwtAuthenticateGuard)
    @Query(returns => TransactionModel)
    async addLiquidity(
        @Args() args: AddLiquidityArgs,
    ): Promise<TransactionModel> {
        return this.transactionService.addLiquidity(args);
    }

    @UseGuards(JwtAuthenticateGuard)
    @Query(returns => [TransactionModel])
    async reclaimTemporaryFunds(
        @Args() args: ReclaimTemporaryFundsArgs,
    ): Promise<TransactionModel[]> {
        return this.transactionService.reclaimTemporaryFunds(args);
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
        return this.transactionService.swapTokensFixedInput(args);
    }

    @UseGuards(JwtAuthenticateGuard)
    @Query(returns => [TransactionModel])
    async swapTokensFixedOutput(
        @Args() args: SwapTokensFixedOutputArgs,
    ): Promise<TransactionModel[]> {
        return this.transactionService.swapTokensFixedOutput(args);
    }

    @UseGuards(JwtAuthenticateGuard)
    @Query(returns => TransactionModel)
    async tokensTransfer(
        @Args() args: ESDTTransferArgs,
    ): Promise<TransactionModel> {
        return this.transactionService.esdtTransfer(args);
    }
}
