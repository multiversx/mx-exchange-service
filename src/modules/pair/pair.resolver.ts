import { PairService } from './services/pair.service';
import { Resolver, Query, ResolveField, Parent, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { LiquidityPosition, PairModel } from './models/pair.model';
import { TransactionModel } from '../../models/transaction.model';
import {
    AddLiquidityArgs,
    RemoveLiquidityArgs,
    SwapTokensFixedInputArgs,
    SwapTokensFixedOutputArgs,
} from './models/pair.args';
import { PairTransactionService } from './services/pair.transactions.service';
import { ApolloError } from 'apollo-server-express';
import { PairGetterService } from './services/pair.getter.service';
import { GqlAuthGuard } from '../auth/gql.auth.guard';
import { User } from 'src/helpers/userDecorator';

@Resolver(() => PairModel)
export class PairResolver {
    constructor(
        private readonly pairService: PairService,
        private readonly pairGetterService: PairGetterService,
        private readonly transactionService: PairTransactionService,
    ) {}

    @ResolveField()
    async firstToken(@Parent() parent: PairModel) {
        try {
            return await this.pairGetterService.getFirstToken(parent.address);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async secondToken(@Parent() parent: PairModel) {
        try {
            return await this.pairGetterService.getSecondToken(parent.address);
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
            return await this.pairGetterService.getFirstTokenPrice(
                parent.address,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async firstTokenPriceUSD(@Parent() parent: PairModel) {
        try {
            return await this.pairGetterService.getFirstTokenPriceUSD(
                parent.address,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async secondTokenPriceUSD(@Parent() parent: PairModel) {
        try {
            return await this.pairGetterService.getSecondTokenPriceUSD(
                parent.address,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async secondTokenPrice(@Parent() parent: PairModel) {
        try {
            return await this.pairGetterService.getSecondTokenPrice(
                parent.address,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async liquidityPoolTokenPriceUSD(@Parent() parent: PairModel) {
        try {
            return await this.pairGetterService.getLpTokenPriceUSD(
                parent.address,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async firstTokenLockedValueUSD(@Parent() parent: PairModel) {
        try {
            return await this.pairGetterService.getFirstTokenLockedValueUSD(
                parent.address,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async secondTokenLockedValueUSD(@Parent() parent: PairModel) {
        try {
            return await this.pairGetterService.getSecondTokenLockedValueUSD(
                parent.address,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async lockedValueUSD(@Parent() parent: PairModel) {
        try {
            return await this.pairGetterService.getLockedValueUSD(
                parent.address,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async firstTokenVolume24h(@Parent() parent: PairModel) {
        try {
            return await this.pairGetterService.getFirstTokenVolume(
                parent.address,
                '24h',
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async secondTokenVolume24h(@Parent() parent: PairModel) {
        try {
            return await this.pairGetterService.getSecondTokenVolume(
                parent.address,
                '24h',
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async volumeUSD24h(@Parent() parent: PairModel) {
        try {
            return await this.pairGetterService.getVolumeUSD(
                parent.address,
                '24h',
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async feesUSD24h(@Parent() parent: PairModel) {
        try {
            return await this.pairGetterService.getFeesUSD(
                parent.address,
                '24h',
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async feesAPR(@Parent() parent: PairModel) {
        try {
            return await this.pairGetterService.getFeesAPR(parent.address);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async info(@Parent() parent: PairModel) {
        try {
            return await this.pairGetterService.getPairInfoMetadata(
                parent.address,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async totalFeePercent(@Parent() parent: PairModel) {
        try {
            return await this.pairGetterService.getTotalFeePercent(
                parent.address,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async specialFeePercent(@Parent() parent: PairModel) {
        try {
            return await this.pairGetterService.getSpecialFeePercent(
                parent.address,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async type(@Parent() parent: PairModel) {
        try {
            return await this.pairGetterService.getType(parent.address);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    async trustedSwapPairs(@Parent() parent: PairModel) {
        try {
            return await this.pairGetterService.getTrustedSwapPairs(
                parent.address,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async state(@Parent() parent: PairModel) {
        try {
            return await this.pairGetterService.getState(parent.address);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @Query(() => String)
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

    @Query(() => String)
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

    @Query(() => String)
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

    @Query(() => LiquidityPosition)
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

    @UseGuards(GqlAuthGuard)
    @Query(() => [TransactionModel])
    async addLiquidityBatch(
        @Args() args: AddLiquidityArgs,
        @User() user: any,
    ): Promise<TransactionModel[]> {
        try {
            return await this.transactionService.addLiquidityBatch(
                user.publicKey,
                args,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => TransactionModel)
    async addLiquidity(
        @Args() args: AddLiquidityArgs,
        @User() user: any,
    ): Promise<TransactionModel> {
        try {
            return await this.transactionService.addLiquidity(
                user.publicKey,
                args,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => [TransactionModel])
    async removeLiquidity(
        @Args() args: RemoveLiquidityArgs,
        @User() user: any,
    ): Promise<TransactionModel[]> {
        return await this.transactionService.removeLiquidity(
            user.publicKey,
            args,
        );
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => [TransactionModel])
    async swapTokensFixedInput(
        @Args() args: SwapTokensFixedInputArgs,
        @User() user: any,
    ): Promise<TransactionModel[]> {
        return this.transactionService.swapTokensFixedInput(
            user.publicKey,
            args,
        );
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => [TransactionModel])
    async swapTokensFixedOutput(
        @Args() args: SwapTokensFixedOutputArgs,
        @User() user: any,
    ): Promise<TransactionModel[]> {
        return this.transactionService.swapTokensFixedOutput(
            user.publicKey,
            args,
        );
    }

    @Query(() => String)
    async burnedTokenAmount(
        @Args('pairAddress') pairAddress: string,
        @Args('tokenID') tokenID: string,
    ): Promise<string> {
        return await this.pairGetterService.getBurnedTokenAmount(
            pairAddress,
            tokenID,
        );
    }
}
