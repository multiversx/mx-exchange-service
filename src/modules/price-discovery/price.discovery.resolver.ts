import { UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { Args, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
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
import { SimpleLockModel } from '../simple-lock/models/simple.lock.model';
import { PriceDiscoveryAbiService } from './services/price.discovery.abi.service';
import { PriceDiscoveryComputeService } from './services/price.discovery.compute.service';
import { HistoricDataModel } from '../analytics/models/analytics.model';
import { PDAnalyticsArgs } from './models/price.discovery.args';

@Resolver(() => PriceDiscoveryModel)
export class PriceDiscoveryResolver {
    constructor(
        private readonly priceDiscoveryService: PriceDiscoveryService,
        private readonly priceDiscoveryAbi: PriceDiscoveryAbiService,
        private readonly priceDiscoveryCompute: PriceDiscoveryComputeService,
        private readonly priceDiscoveryTransactions: PriceDiscoveryTransactionService,
    ) {}

    @ResolveField()
    async launchedToken(
        @Parent() parent: PriceDiscoveryModel,
    ): Promise<EsdtToken> {
        return this.priceDiscoveryService.getLaunchedToken(parent.address);
    }

    @ResolveField()
    async acceptedToken(
        @Parent() parent: PriceDiscoveryModel,
    ): Promise<EsdtToken> {
        return this.priceDiscoveryService.getAcceptedToken(parent.address);
    }

    @ResolveField()
    async redeemToken(
        @Parent() parent: PriceDiscoveryModel,
    ): Promise<NftCollection> {
        return this.priceDiscoveryService.getRedeemToken(parent.address);
    }

    @ResolveField()
    async launchedTokenAmount(
        @Parent() parent: PriceDiscoveryModel,
    ): Promise<string> {
        return this.priceDiscoveryAbi.launchedTokenAmount(parent.address);
    }

    @ResolveField()
    async acceptedTokenAmount(
        @Parent() parent: PriceDiscoveryModel,
    ): Promise<string> {
        return this.priceDiscoveryAbi.acceptedTokenAmount(parent.address);
    }

    @ResolveField()
    async launchedTokenRedeemBalance(
        @Parent() parent: PriceDiscoveryModel,
    ): Promise<string> {
        return this.priceDiscoveryAbi.launchedTokenRedeemAmount(parent.address);
    }

    @ResolveField()
    async acceptedTokenRedeemBalance(
        @Parent() parent: PriceDiscoveryModel,
    ): Promise<string> {
        return this.priceDiscoveryAbi.acceptedTokenRedeemAmount(parent.address);
    }

    @ResolveField()
    async launchedTokenPrice(
        @Parent() parent: PriceDiscoveryModel,
    ): Promise<string> {
        return this.priceDiscoveryCompute.launchedTokenPrice(parent.address);
    }

    @ResolveField()
    async acceptedTokenPrice(
        @Parent() parent: PriceDiscoveryModel,
    ): Promise<string> {
        return this.priceDiscoveryCompute.acceptedTokenPrice(parent.address);
    }

    @ResolveField()
    async launchedTokenPriceUSD(
        @Parent() parent: PriceDiscoveryModel,
    ): Promise<string> {
        return this.priceDiscoveryCompute.launchedTokenPriceUSD(parent.address);
    }

    @ResolveField()
    async acceptedTokenPriceUSD(
        @Parent() parent: PriceDiscoveryModel,
    ): Promise<string> {
        return this.priceDiscoveryCompute.acceptedTokenPriceUSD(parent.address);
    }

    @ResolveField()
    async startBlock(@Parent() parent: PriceDiscoveryModel): Promise<number> {
        return this.priceDiscoveryAbi.startBlock(parent.address);
    }

    @ResolveField()
    async endBlock(@Parent() parent: PriceDiscoveryModel): Promise<number> {
        return this.priceDiscoveryAbi.endBlock(parent.address);
    }

    @ResolveField()
    async currentPhase(
        @Parent() parent: PriceDiscoveryModel,
    ): Promise<PhaseModel> {
        return this.priceDiscoveryAbi.currentPhase(parent.address);
    }

    @ResolveField()
    async minLaunchedTokenPrice(
        @Parent() parent: PriceDiscoveryModel,
    ): Promise<string> {
        return this.priceDiscoveryAbi.minLaunchedTokenPrice(parent.address);
    }

    @ResolveField()
    async noLimitPhaseDurationBlocks(
        @Parent() parent: PriceDiscoveryModel,
    ): Promise<number> {
        return this.priceDiscoveryAbi.noLimitPhaseDurationBlocks(
            parent.address,
        );
    }

    @ResolveField()
    async linearPenaltyPhaseDurationBlocks(
        @Parent() parent: PriceDiscoveryModel,
    ): Promise<number> {
        return this.priceDiscoveryAbi.linearPenaltyPhaseDurationBlocks(
            parent.address,
        );
    }

    @ResolveField()
    async fixedPenaltyPhaseDurationBlocks(
        @Parent() parent: PriceDiscoveryModel,
    ): Promise<number> {
        return this.priceDiscoveryAbi.fixedPenaltyPhaseDurationBlocks(
            parent.address,
        );
    }

    @ResolveField(() => SimpleLockModel)
    async lockingSC(
        @Parent() parent: PriceDiscoveryModel,
    ): Promise<SimpleLockModel> {
        return this.priceDiscoveryService.getLockingSC(parent.address);
    }

    @ResolveField()
    async lockingScAddress(
        @Parent() parent: PriceDiscoveryModel,
    ): Promise<string> {
        return this.priceDiscoveryAbi.lockingScAddress(parent.address);
    }

    @ResolveField()
    async unlockEpoch(@Parent() parent: PriceDiscoveryModel): Promise<number> {
        return this.priceDiscoveryAbi.unlockEpoch(parent.address);
    }

    @ResolveField()
    async penaltyMinPercentage(
        @Parent() parent: PriceDiscoveryModel,
    ): Promise<number> {
        return this.priceDiscoveryAbi.penaltyMinPercentage(parent.address);
    }

    @ResolveField()
    async penaltyMaxPercentage(
        @Parent() parent: PriceDiscoveryModel,
    ): Promise<number> {
        return this.priceDiscoveryAbi.penaltyMaxPercentage(parent.address);
    }

    @ResolveField()
    async fixedPenaltyPercentage(
        @Parent() parent: PriceDiscoveryModel,
    ): Promise<number> {
        return this.priceDiscoveryAbi.fixedPenaltyPercentage(parent.address);
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
        return this.priceDiscoveryTransactions.depositBatch(
            priceDiscoveryAddress,
            user.address,
            inputTokens,
        );
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => TransactionModel)
    async depositOnPriceDiscovery(
        @Args('priceDiscoveryAddress') priceDiscoveryAddress: string,
        @Args('inputTokens') inputTokens: InputTokenModel,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        return this.priceDiscoveryTransactions.deposit(
            user.address,
            priceDiscoveryAddress,
            inputTokens,
        );
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => [TransactionModel])
    async withdrawBatchFromPriceDiscovery(
        @Args('priceDiscoveryAddress') priceDiscoveryAddress: string,
        @Args('inputTokens') inputTokens: InputTokenModel,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel[]> {
        return this.priceDiscoveryTransactions.genericBatchRedeemInteraction(
            priceDiscoveryAddress,
            user.address,
            inputTokens,
            'withdraw',
        );
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => TransactionModel)
    async withdrawFromPriceDiscovery(
        @Args('priceDiscoveryAddress') priceDiscoveryAddress: string,
        @Args('inputTokens') inputTokens: InputTokenModel,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        return this.priceDiscoveryTransactions.genericRedeemInteraction(
            priceDiscoveryAddress,
            user.address,
            inputTokens,
            'withdraw',
        );
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => [TransactionModel])
    async redeemTokensBatchFromPriceDiscovery(
        @Args('priceDiscoveryAddress') priceDiscoveryAddress: string,
        @Args('inputTokens') inputTokens: InputTokenModel,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel[]> {
        return this.priceDiscoveryTransactions.genericBatchRedeemInteraction(
            priceDiscoveryAddress,
            user.address,
            inputTokens,
            'redeem',
        );
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => TransactionModel)
    async redeemTokensFromPriceDiscovery(
        @Args('priceDiscoveryAddress') priceDiscoveryAddress: string,
        @Args('inputTokens') inputTokens: InputTokenModel,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        return this.priceDiscoveryTransactions.genericRedeemInteraction(
            priceDiscoveryAddress,
            user.address,
            inputTokens,
            'redeem',
        );
    }

    @Query(() => [HistoricDataModel])
    @UsePipes(
        new ValidationPipe({
            skipNullProperties: true,
            skipMissingProperties: true,
            skipUndefinedProperties: true,
        }),
    )
    async closingValues(
        @Args() args: PDAnalyticsArgs,
    ): Promise<HistoricDataModel[]> {
        return this.priceDiscoveryCompute.closingValues(
            args.priceDiscoveryAddress,
            args.metric,
            args.bucket,
        );
    }
}
