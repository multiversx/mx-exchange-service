import { UseGuards } from '@nestjs/common';
import { Args, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { ApolloError } from 'apollo-server-express';
import { AuthUser } from '../auth/auth.user';
import { UserAuthResult } from '../auth/user.auth.result';
import { InputTokenModel } from 'src/models/inputToken.model';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import { NftCollection } from 'src/modules/tokens/models/nftCollection.model';
import { TransactionModel } from 'src/models/transaction.model';
import { JwtOrNativeAuthGuard } from '../auth/jwt.or.native.auth.guard';
import {
    PhaseModel,
    PriceDiscoveryModel,
} from './models/price.discovery.model';
import { PriceDiscoveryService } from './services/price.discovery.service';
import { PriceDiscoveryTransactionService } from './services/price.discovery.transactions.service';
import { GenericResolver } from '../../services/generics/generic.resolver';
import { SimpleLockModel } from '../simple-lock/models/simple.lock.model';
import { PriceDiscoveryAbiService } from './services/price.discovery.abi.service';
import { PriceDiscoveryComputeService } from './services/price.discovery.compute.service';

@Resolver(() => PriceDiscoveryModel)
export class PriceDiscoveryResolver extends GenericResolver {
    constructor(
        private readonly priceDiscoveryService: PriceDiscoveryService,
        private readonly priceDiscoveryAbi: PriceDiscoveryAbiService,
        private readonly priceDiscoveryCompute: PriceDiscoveryComputeService,
        private readonly priceDiscoveryTransactions: PriceDiscoveryTransactionService,
    ) {
        super();
    }

    @ResolveField()
    async launchedToken(
        @Parent() parent: PriceDiscoveryModel,
    ): Promise<EsdtToken> {
        return await this.genericFieldResolver(() =>
            this.priceDiscoveryService.getLaunchedToken(parent.address),
        );
    }

    @ResolveField()
    async acceptedToken(
        @Parent() parent: PriceDiscoveryModel,
    ): Promise<EsdtToken> {
        return await this.genericFieldResolver(() =>
            this.priceDiscoveryService.getAcceptedToken(parent.address),
        );
    }

    @ResolveField()
    async redeemToken(
        @Parent() parent: PriceDiscoveryModel,
    ): Promise<NftCollection> {
        return await this.genericFieldResolver(() =>
            this.priceDiscoveryService.getRedeemToken(parent.address),
        );
    }

    @ResolveField()
    async launchedTokenAmount(
        @Parent() parent: PriceDiscoveryModel,
    ): Promise<string> {
        return await this.genericFieldResolver(() =>
            this.priceDiscoveryAbi.launchedTokenAmount(parent.address),
        );
    }

    @ResolveField()
    async acceptedTokenAmount(
        @Parent() parent: PriceDiscoveryModel,
    ): Promise<string> {
        return await this.genericFieldResolver(() =>
            this.priceDiscoveryAbi.acceptedTokenAmount(parent.address),
        );
    }

    @ResolveField()
    async launchedTokenRedeemBalance(
        @Parent() parent: PriceDiscoveryModel,
    ): Promise<string> {
        return await this.genericFieldResolver(() =>
            this.priceDiscoveryAbi.launchedTokenRedeemAmount(parent.address),
        );
    }

    @ResolveField()
    async acceptedTokenRedeemBalance(
        @Parent() parent: PriceDiscoveryModel,
    ): Promise<string> {
        return await this.genericFieldResolver(() =>
            this.priceDiscoveryAbi.acceptedTokenRedeemAmount(parent.address),
        );
    }

    @ResolveField()
    async launchedTokenPrice(
        @Parent() parent: PriceDiscoveryModel,
    ): Promise<string> {
        return await this.genericFieldResolver(() =>
            this.priceDiscoveryCompute.launchedTokenPrice(parent.address),
        );
    }

    @ResolveField()
    async acceptedTokenPrice(
        @Parent() parent: PriceDiscoveryModel,
    ): Promise<string> {
        return await this.genericFieldResolver(() =>
            this.priceDiscoveryCompute.acceptedTokenPrice(parent.address),
        );
    }

    @ResolveField()
    async launchedTokenPriceUSD(
        @Parent() parent: PriceDiscoveryModel,
    ): Promise<string> {
        return await this.genericFieldResolver(() =>
            this.priceDiscoveryCompute.launchedTokenPriceUSD(parent.address),
        );
    }

    @ResolveField()
    async acceptedTokenPriceUSD(
        @Parent() parent: PriceDiscoveryModel,
    ): Promise<string> {
        return await this.genericFieldResolver(() =>
            this.priceDiscoveryCompute.acceptedTokenPriceUSD(parent.address),
        );
    }

    @ResolveField()
    async startBlock(@Parent() parent: PriceDiscoveryModel): Promise<number> {
        return await this.genericFieldResolver(() =>
            this.priceDiscoveryAbi.startBlock(parent.address),
        );
    }

    @ResolveField()
    async endBlock(@Parent() parent: PriceDiscoveryModel): Promise<number> {
        return await this.genericFieldResolver(() =>
            this.priceDiscoveryAbi.endBlock(parent.address),
        );
    }

    @ResolveField()
    async currentPhase(
        @Parent() parent: PriceDiscoveryModel,
    ): Promise<PhaseModel> {
        return await this.genericFieldResolver(() =>
            this.priceDiscoveryAbi.currentPhase(parent.address),
        );
    }

    @ResolveField()
    async minLaunchedTokenPrice(
        @Parent() parent: PriceDiscoveryModel,
    ): Promise<string> {
        return await this.genericFieldResolver(() =>
            this.priceDiscoveryAbi.minLaunchedTokenPrice(parent.address),
        );
    }

    @ResolveField()
    async noLimitPhaseDurationBlocks(
        @Parent() parent: PriceDiscoveryModel,
    ): Promise<number> {
        return await this.genericFieldResolver(() =>
            this.priceDiscoveryAbi.noLimitPhaseDurationBlocks(parent.address),
        );
    }

    @ResolveField()
    async linearPenaltyPhaseDurationBlocks(
        @Parent() parent: PriceDiscoveryModel,
    ): Promise<number> {
        return await this.genericFieldResolver(() =>
            this.priceDiscoveryAbi.linearPenaltyPhaseDurationBlocks(
                parent.address,
            ),
        );
    }

    @ResolveField()
    async fixedPenaltyPhaseDurationBlocks(
        @Parent() parent: PriceDiscoveryModel,
    ): Promise<number> {
        return await this.genericFieldResolver(() =>
            this.priceDiscoveryAbi.fixedPenaltyPhaseDurationBlocks(
                parent.address,
            ),
        );
    }

    @ResolveField(() => SimpleLockModel)
    async lockingSC(
        @Parent() parent: PriceDiscoveryModel,
    ): Promise<SimpleLockModel> {
        return await this.genericFieldResolver(() =>
            this.priceDiscoveryService.getLockingSC(parent.address),
        );
    }

    @ResolveField()
    async lockingScAddress(
        @Parent() parent: PriceDiscoveryModel,
    ): Promise<string> {
        return await this.genericFieldResolver(() =>
            this.priceDiscoveryAbi.lockingScAddress(parent.address),
        );
    }

    @ResolveField()
    async unlockEpoch(@Parent() parent: PriceDiscoveryModel): Promise<number> {
        return await this.genericFieldResolver(() =>
            this.priceDiscoveryAbi.unlockEpoch(parent.address),
        );
    }

    @ResolveField()
    async penaltyMinPercentage(
        @Parent() parent: PriceDiscoveryModel,
    ): Promise<number> {
        return await this.genericFieldResolver(() =>
            this.priceDiscoveryAbi.penaltyMinPercentage(parent.address),
        );
    }

    @ResolveField()
    async penaltyMaxPercentage(
        @Parent() parent: PriceDiscoveryModel,
    ): Promise<number> {
        return await this.genericFieldResolver(() =>
            this.priceDiscoveryAbi.penaltyMaxPercentage(parent.address),
        );
    }

    @ResolveField()
    async fixedPenaltyPercentage(
        @Parent() parent: PriceDiscoveryModel,
    ): Promise<number> {
        return await this.genericFieldResolver(() =>
            this.priceDiscoveryAbi.fixedPenaltyPercentage(parent.address),
        );
    }

    @Query(() => [PriceDiscoveryModel])
    async priceDiscoveryContracts(): Promise<PriceDiscoveryModel[]> {
        return this.priceDiscoveryService.getPriceDiscoveryContracts();
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => [TransactionModel])
    async depositBatchOnPriceDiscovery(
        @Args('priceDiscoveryAddress') priceDiscoveryAddress: string,
        @Args('inputTokens') inputTokens: InputTokenModel,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel[]> {
        try {
            return await this.priceDiscoveryTransactions.depositBatch(
                priceDiscoveryAddress,
                user.address,
                inputTokens,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => TransactionModel)
    async depositOnPriceDiscovery(
        @Args('priceDiscoveryAddress') priceDiscoveryAddress: string,
        @Args('inputTokens') inputTokens: InputTokenModel,
    ): Promise<TransactionModel> {
        try {
            return await this.priceDiscoveryTransactions.deposit(
                priceDiscoveryAddress,
                inputTokens,
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => [TransactionModel])
    async withdrawBatchFromPriceDiscovery(
        @Args('priceDiscoveryAddress') priceDiscoveryAddress: string,
        @Args('inputTokens') inputTokens: InputTokenModel,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel[]> {
        try {
            return await this.priceDiscoveryTransactions.genericBatchRedeemInteraction(
                priceDiscoveryAddress,
                user.address,
                inputTokens,
                'withdraw',
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => TransactionModel)
    async withdrawFromPriceDiscovery(
        @Args('priceDiscoveryAddress') priceDiscoveryAddress: string,
        @Args('inputTokens') inputTokens: InputTokenModel,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        try {
            return await this.priceDiscoveryTransactions.genericRedeemInteraction(
                priceDiscoveryAddress,
                user.address,
                inputTokens,
                'withdraw',
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => [TransactionModel])
    async redeemTokensBatchFromPriceDiscovery(
        @Args('priceDiscoveryAddress') priceDiscoveryAddress: string,
        @Args('inputTokens') inputTokens: InputTokenModel,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel[]> {
        try {
            return await this.priceDiscoveryTransactions.genericBatchRedeemInteraction(
                priceDiscoveryAddress,
                user.address,
                inputTokens,
                'redeem',
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => TransactionModel)
    async redeemTokensFromPriceDiscovery(
        @Args('priceDiscoveryAddress') priceDiscoveryAddress: string,
        @Args('inputTokens') inputTokens: InputTokenModel,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        try {
            return await this.priceDiscoveryTransactions.genericRedeemInteraction(
                priceDiscoveryAddress,
                user.address,
                inputTokens,
                'redeem',
            );
        } catch (error) {
            throw new ApolloError(error);
        }
    }
}
