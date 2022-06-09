import { PairService } from './services/pair.service';
import { Resolver, Query, ResolveField, Parent, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import {
    BPConfig,
    FeeDestination,
    LiquidityPosition,
    PairModel,
} from './models/pair.model';
import { TransactionModel } from '../../models/transaction.model';
import {
    AddLiquidityArgs,
    RemoveLiquidityAndBuyBackAndBurnArgs,
    RemoveLiquidityArgs,
    SetLpTokenIdentifierArgs,
    SwapNoFeeAndForwardArgs,
    SwapTokensFixedInputArgs,
    SwapTokensFixedOutputArgs,
    WhitelistArgs,
} from './models/pair.args';
import { PairTransactionService } from './services/pair.transactions.service';
import { ApolloError } from 'apollo-server-express';
import { PairGetterService } from './services/pair.getter.service';
import { GqlAuthGuard } from '../auth/gql.auth.guard';
import { User } from 'src/helpers/userDecorator';
import { PairInfoModel } from './models/pair-info.model';
import { GqlAdminGuard } from '../auth/gql.admin.guard';
import { EsdtTokenPayment } from 'src/models/esdtTokenPayment.model';

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
            return await this.pairGetterService.getLpToken(parent.address);
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

    @ResolveField()
    async lockedTokensInfo(@Parent() parent: PairModel) {
        try {
            return await this.pairGetterService.getLockedTokensInfo(
                parent.address,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async whitelistedManagedAddresses(@Parent() parent: PairModel) {
        try {
            return await this.pairGetterService.getWhitelistedManagedAddresses(
                parent.address,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async externSwapGasLimit(@Parent() parent: PairModel) {
        try {
            return await this.pairGetterService.getExternSwapGasLimit(
                parent.address,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async initialLiquidityAdder(@Parent() parent: PairModel) {
        try {
            return await this.pairGetterService.getInitialLiquidityAdder(
                parent.address,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async transferExecGasLimit(@Parent() parent: PairModel) {
        try {
            return await this.pairGetterService.getTransferExecGasLimit(
                parent.address,
            );
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

    @Query(() => LiquidityPosition)
    async getTokensForGivenPosition(
        @Args('pairAddress') pairAddress: string,
        @Args('liquidityAmount') liquidityAmount: string,
    ) {
        try {
            return await this.pairGetterService.getTokensForGivenPosition(
                pairAddress,
                liquidityAmount,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @Query(() => String)
    async getReserve(
        @Args('pairAddress') pairAddress: string,
        @Args('tokenID') tokenID: string,
    ) {
        return await this.pairGetterService.getReserve(pairAddress, tokenID);
    }

    @Query(() => PairInfoModel)
    async getReservesAndTotalSupply(@Args('pairAddress') pairAddress: string) {
        try {
            return await this.pairGetterService.getReservesAndTotalSupply(
                pairAddress,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @Query(() => Boolean)
    async getFeeState(@Args('pairAddress') pairAddress: string) {
        try {
            return await this.pairGetterService.getFeeState(pairAddress);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @Query(() => String)
    async getRouterManagedAddress(@Args('address') address: string) {
        return await this.pairGetterService.getRouterManagedAddress(address);
    }

    @Query(() => String)
    async getRouterOwnerManagedAddress(@Args('address') address: string) {
        return await this.pairGetterService.getRouterOwnerManagedAddress(
            address,
        );
    }

    @Query(() => TransactionModel)
    async updateAndGetTokensForGivenPositionWithSafePrice(
        @Args('pairAddress') pairAddress: string,
        @Args('liquidity') liquidity: string,
    ) {
        return await this.transactionService.updateAndGetTokensForGivenPositionWithSafePrice(
            pairAddress,
            liquidity,
        );
    }

    @Query(() => [FeeDestination])
    async getFeeDestinations(@Args('pairAddress') pairAddress: string) {
        return await this.pairGetterService.getFeeDestinations(pairAddress);
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => [TransactionModel])
    async addInitialLiquidityBatch(
        @Args() args: AddLiquidityArgs,
        @User() user: any,
    ) {
        try {
            return await this.transactionService.addInitialLiquidityBatch(
                user.publicKey,
                args,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => [TransactionModel])
    async addLiquidityBatch(@Args() args: AddLiquidityArgs, @User() user: any) {
        try {
            return await this.transactionService.addLiquidityBatch(
                user.publicKey,
                args,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @Query(() => EsdtTokenPayment)
    async updateAndGetSafePrice(
        @Args('pairAddress') pairAddress: string,
        @Args('esdtTokenPayment') esdtTokenPayment: EsdtTokenPayment,
    ) {
        return await this.pairGetterService.updateAndGetSafePrice(
            pairAddress,
            esdtTokenPayment,
        );
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => TransactionModel)
    async addLiquidity(@Args() args: AddLiquidityArgs, @User() user: any) {
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
    ) {
        return await this.transactionService.removeLiquidity(
            user.publicKey,
            args,
        );
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => TransactionModel)
    async removeLiquidityAndBuyBackAndBurnToken(
        @Args() args: RemoveLiquidityAndBuyBackAndBurnArgs,
    ) {
        return await this.transactionService.removeLiquidityAndBuyBackAndBurnToken(
            args,
        );
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => [TransactionModel])
    async swapTokensFixedInput(
        @Args() args: SwapTokensFixedInputArgs,
        @User() user: any,
    ) {
        return await this.transactionService.swapTokensFixedInput(
            user.publicKey,
            args,
        );
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => [TransactionModel])
    async swapTokensFixedOutput(
        @Args() args: SwapTokensFixedOutputArgs,
        @User() user: any,
    ) {
        return await this.transactionService.swapTokensFixedOutput(
            user.publicKey,
            args,
        );
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => TransactionModel)
    async swapNoFeeAndForward(@Args() args: SwapNoFeeAndForwardArgs) {
        return await this.transactionService.swapNoFeeAndForward(args);
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => TransactionModel)
    async setLpTokenIdentifier(@Args() args: SetLpTokenIdentifierArgs) {
        return await this.transactionService.setLpTokenIdentifier(args);
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => String)
    async getNumSwapsByAddress(
        @Args('pairAddress') pairAddress: string,
        @Args('address') address: string,
    ) {
        try {
            return await this.pairGetterService.getNumSwapsByAddress(
                pairAddress,
                address,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => String)
    async getNumAddsByAddress(
        @Args('pairAddress') pairAddress: string,
        @Args('address') address: string,
    ) {
        try {
            return await this.pairGetterService.getNumAddsByAddress(
                pairAddress,
                address,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAdminGuard)
    @Query(() => TransactionModel)
    async whitelist(@Args() args: WhitelistArgs, @User() user: any) {
        try {
            await this.pairService.requireOwner(
                args.pairAddress,
                user.publicKey,
            );
            return await this.transactionService.whitelist(args);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAdminGuard)
    @Query(() => TransactionModel)
    async removeWhitelist(@Args() args: WhitelistArgs, @User() user: any) {
        try {
            await this.pairService.requireOwner(
                args.pairAddress,
                user.publicKey,
            );
            return await this.transactionService.removeWhitelist(args);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAdminGuard)
    @Query(() => TransactionModel)
    async addTrustedSwapPair(
        @Args('pairAddress') pairAddress: string,
        @Args('swapPairAddress') swapPairAddress: string,
        @Args('firstTokenID') firstTokenID: string,
        @Args('secondTokenID') secondTokenID: string,
        @User() user: any,
    ) {
        try {
            await this.pairService.requireOwner(pairAddress, user.publicKey);
            return await this.transactionService.addTrustedSwapPair(
                pairAddress,
                swapPairAddress,
                firstTokenID,
                secondTokenID,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAdminGuard)
    @Query(() => TransactionModel)
    async removeTrustedSwapPair(
        @Args('pairAddress') pairAddress: string,
        @Args('firstTokenID') firstTokenID: string,
        @Args('secondTokenID') secondTokenID: string,
        @User() user: any,
    ) {
        try {
            await this.pairService.requireOwner(pairAddress, user.publicKey);
            return await this.transactionService.removeTrustedSwapPair(
                pairAddress,
                firstTokenID,
                secondTokenID,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAdminGuard)
    @Query(() => TransactionModel)
    async setTransferExecGasLimit(
        @Args('pairAddress') pairAddress: string,
        @Args('gasLimit') gasLimit: string,
        @User() user: any,
    ) {
        try {
            await this.pairService.requireOwner(pairAddress, user.publicKey);
            return await this.transactionService.setTransferExecGasLimit(
                pairAddress,
                gasLimit,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAdminGuard)
    @Query(() => TransactionModel)
    async setExternExecGasLimit(
        @Args('pairAddress') pairAddress: string,
        @Args('gasLimit') gasLimit: string,
        @User() user: any,
    ) {
        try {
            await this.pairService.requireOwner(pairAddress, user.publicKey);
            return await this.transactionService.setExternExecGasLimit(
                pairAddress,
                gasLimit,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAdminGuard)
    @Query(() => TransactionModel)
    async pause(@Args('pairAddress') pairAddress: string, @User() user: any) {
        try {
            await this.pairService.requireOwner(pairAddress, user.publicKey);
            return await this.transactionService.pause(pairAddress);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAdminGuard)
    @Query(() => TransactionModel)
    async resume(@Args('pairAddress') pairAddress: string, @User() user: any) {
        try {
            await this.pairService.requireOwner(pairAddress, user.publicKey);
            return await this.transactionService.resume(pairAddress);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAdminGuard)
    @Query(() => TransactionModel)
    async setStateActiveNoSwaps(
        @Args('pairAddress') pairAddress: string,
        @User() user: any,
    ) {
        try {
            await this.pairService.requireOwner(pairAddress, user.publicKey);
            return await this.transactionService.setStateActiveNoSwaps(
                pairAddress,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAdminGuard)
    @Query(() => TransactionModel)
    async setFeePercents(
        @Args('pairAddress') pairAddress: string,
        @Args('totalFeePercent') totalFeePercent: string,
        @Args('specialFeePercent') specialFeePercent: string,
        @User() user: any,
    ) {
        try {
            await this.pairService.requireOwner(pairAddress, user.publicKey);
            return await this.transactionService.setFeePercents(
                pairAddress,
                totalFeePercent,
                specialFeePercent,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAdminGuard)
    @Query(() => TransactionModel)
    async setMaxObservationsPerRecord(
        @Args('pairAddress') pairAddress: string,
        @Args('maxObservationsPerRecord') maxObservationsPerRecord: string,
        @User() user: any,
    ) {
        try {
            await this.pairService.requireOwner(pairAddress, user.publicKey);
            return await this.transactionService.setMaxObservationsPerRecord(
                pairAddress,
                maxObservationsPerRecord,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAdminGuard)
    @Query(() => TransactionModel)
    async setBPSwapConfig(
        @Args('pairAddress') pairAddress: string,
        @Args('config') config: BPConfig,
        @User() user: any,
    ) {
        try {
            await this.pairService.requireOwner(pairAddress, user.publicKey);
            return await this.transactionService.setBPSwapConfig(
                pairAddress,
                config,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAdminGuard)
    @Query(() => TransactionModel)
    async setBPRemoveConfig(
        @Args('pairAddress') pairAddress: string,
        @Args('config') config: BPConfig,
        @User() user: any,
    ) {
        try {
            await this.pairService.requireOwner(pairAddress, user.publicKey);
            return await this.transactionService.setBPRemoveConfig(
                pairAddress,
                config,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAdminGuard)
    @Query(() => TransactionModel)
    async setBPAddConfig(
        @Args('pairAddress') pairAddress: string,
        @Args('config') config: BPConfig,
        @User() user: any,
    ) {
        try {
            await this.pairService.requireOwner(pairAddress, user.publicKey);
            return await this.transactionService.setBPAddConfig(
                pairAddress,
                config,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAdminGuard)
    @Query(() => TransactionModel)
    async setLockingDeadlineEpoch(
        @Args('pairAddress') pairAddress: string,
        @Args('newDeadline') newDeadline: string,
        @User() user: any,
    ) {
        try {
            await this.pairService.requireOwner(pairAddress, user.publicKey);
            return await this.transactionService.setLockingDeadlineEpoch(
                pairAddress,
                newDeadline,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAdminGuard)
    @Query(() => TransactionModel)
    async setLockingScAddress(
        @Args('pairAddress') pairAddress: string,
        @Args('newAddress') newAddress: string,
        @User() user: any,
    ) {
        try {
            await this.pairService.requireOwner(pairAddress, user.publicKey);
            return await this.transactionService.setLockingScAddress(
                pairAddress,
                newAddress,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAdminGuard)
    @Query(() => TransactionModel)
    async setUnlockEpoch(
        @Args('pairAddress') pairAddress: string,
        @Args('newEpoch') newEpoch: string,
        @User() user: any,
    ) {
        try {
            await this.pairService.requireOwner(pairAddress, user.publicKey);
            return await this.transactionService.setUnlockEpoch(
                pairAddress,
                newEpoch,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }
}
