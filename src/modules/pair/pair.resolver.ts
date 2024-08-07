import { PairService } from './services/pair.service';
import { Resolver, Query, ResolveField, Parent, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import {
    FeeDestination,
    LiquidityPosition,
    LockedTokensInfo,
    PairCompoundedAPRModel,
    PairModel,
    PairRewardTokensModel,
} from './models/pair.model';
import { TransactionModel } from '../../models/transaction.model';
import {
    AddLiquidityArgs,
    RemoveLiquidityArgs,
    SwapTokensFixedInputArgs,
    SwapTokensFixedOutputArgs,
    WhitelistArgs,
} from './models/pair.args';
import { PairTransactionService } from './services/pair.transactions.service';
import { JwtOrNativeAuthGuard } from '../auth/jwt.or.native.auth.guard';
import { AuthUser } from '../auth/auth.user';
import { UserAuthResult } from '../auth/user.auth.result';
import { PairInfoModel } from './models/pair-info.model';
import { EsdtTokenPayment } from 'src/models/esdtTokenPayment.model';
import { EsdtToken } from '../tokens/models/esdtToken.model';
import { PairAbiService } from './services/pair.abi.service';
import { PairComputeService } from './services/pair.compute.service';
import { JwtOrNativeAdminGuard } from '../auth/jwt.or.native.admin.guard';
import { FeesCollectorModel } from '../fees-collector/models/fees-collector.model';
import { constantsConfig } from 'src/config';
import { GenericResolver } from 'src/services/generics/generic.resolver';
import { FarmComputeServiceV2 } from '../farm/v2/services/farm.v2.compute.service';
import { StakingComputeService } from '../staking/services/staking.compute.service';
import { StakingProxyService } from '../staking-proxy/services/staking.proxy.service';
import { NftCollection } from '../tokens/models/nftCollection.model';
import { EnergyService } from '../energy/services/energy.service';

@Resolver(() => PairRewardTokensModel)
export class PairRewardTokensResolver extends GenericResolver {
    constructor(
        private readonly pairCompute: PairComputeService,
        private readonly pairService: PairService,
        private readonly stakingProxyService: StakingProxyService,
        private readonly energyService: EnergyService,
    ) {
        super();
    }

    @ResolveField()
    async poolRewards(
        @Parent() parent: PairRewardTokensModel,
    ): Promise<EsdtToken[]> {
        return await Promise.all([
            this.pairService.getFirstToken(parent.address),
            this.pairService.getSecondToken(parent.address),
        ]);
    }

    @ResolveField()
    async farmReward(
        @Parent() parent: PairRewardTokensModel,
    ): Promise<NftCollection> {
        const farmAddress = await this.pairCompute.getPairFarmAddress(
            parent.address,
        );

        if (!farmAddress) {
            return undefined;
        }

        return await this.energyService.getLockedToken();
    }

    @ResolveField()
    async dualFarmReward(
        @Parent() parent: PairRewardTokensModel,
    ): Promise<EsdtToken> {
        const stakingProxyAddress =
            await this.pairCompute.getPairStakingProxyAddress(parent.address);

        if (!stakingProxyAddress) {
            return undefined;
        }

        return await this.stakingProxyService.getStakingToken(
            stakingProxyAddress,
        );
    }
}

@Resolver(() => PairCompoundedAPRModel)
export class PairCompoundedAPRResolver extends GenericResolver {
    constructor(
        private readonly pairCompute: PairComputeService,
        private readonly farmCompute: FarmComputeServiceV2,
        private readonly stakingCompute: StakingComputeService,
    ) {
        super();
    }

    @ResolveField(() => String)
    async feesAPR(@Parent() parent: PairCompoundedAPRModel): Promise<string> {
        return await this.pairCompute.feesAPR(parent.address);
    }

    @ResolveField(() => String)
    async farmBaseAPR(
        @Parent() parent: PairCompoundedAPRModel,
    ): Promise<string> {
        const farmAddress = await this.pairCompute.getPairFarmAddress(
            parent.address,
        );

        if (!farmAddress) {
            return '0';
        }

        return await this.farmCompute.farmBaseAPR(farmAddress);
    }

    @ResolveField(() => String)
    async farmBoostedAPR(
        @Parent() parent: PairCompoundedAPRModel,
    ): Promise<string> {
        const farmAddress = await this.pairCompute.getPairFarmAddress(
            parent.address,
        );

        if (!farmAddress) {
            return '0';
        }

        return await this.farmCompute.maxBoostedApr(farmAddress);
    }

    @ResolveField(() => String)
    async dualFarmBaseAPR(
        @Parent() parent: PairCompoundedAPRModel,
    ): Promise<string> {
        const stakingAddress = await this.pairCompute.getPairStakingFarmAddress(
            parent.address,
        );

        if (!stakingAddress) {
            return '0';
        }

        return await this.stakingCompute.stakeFarmBaseAPR(stakingAddress);
    }

    @ResolveField(() => String)
    async dualFarmBoostedAPR(
        @Parent() parent: PairCompoundedAPRModel,
    ): Promise<string> {
        const stakingAddress = await this.pairCompute.getPairStakingFarmAddress(
            parent.address,
        );

        if (!stakingAddress) {
            return '0';
        }

        return await this.stakingCompute.boostedApr(stakingAddress);
    }
}

@Resolver(() => PairModel)
export class PairResolver {
    constructor(
        private readonly pairService: PairService,
        private readonly pairAbi: PairAbiService,
        private readonly pairCompute: PairComputeService,
        private readonly transactionService: PairTransactionService,
    ) {}

    @ResolveField()
    async firstToken(@Parent() parent: PairModel): Promise<EsdtToken> {
        return this.pairService.getFirstToken(parent.address);
    }

    @ResolveField()
    async secondToken(@Parent() parent: PairModel): Promise<EsdtToken> {
        return this.pairService.getSecondToken(parent.address);
    }

    @ResolveField()
    async liquidityPoolToken(@Parent() parent: PairModel): Promise<EsdtToken> {
        return this.pairService.getLpToken(parent.address);
    }

    @ResolveField()
    async firstTokenPrice(@Parent() parent: PairModel): Promise<string> {
        return this.pairCompute.firstTokenPrice(parent.address);
    }

    @ResolveField()
    async firstTokenPriceUSD(@Parent() parent: PairModel): Promise<string> {
        return this.pairCompute.firstTokenPriceUSD(parent.address);
    }

    @ResolveField()
    async secondTokenPriceUSD(@Parent() parent: PairModel): Promise<string> {
        return this.pairCompute.secondTokenPriceUSD(parent.address);
    }

    @ResolveField()
    async secondTokenPrice(@Parent() parent: PairModel): Promise<string> {
        return this.pairCompute.secondTokenPrice(parent.address);
    }

    @ResolveField()
    async liquidityPoolTokenPriceUSD(
        @Parent() parent: PairModel,
    ): Promise<string> {
        return this.pairCompute.lpTokenPriceUSD(parent.address);
    }

    @ResolveField()
    async firstTokenLockedValueUSD(
        @Parent() parent: PairModel,
    ): Promise<string> {
        return this.pairCompute.firstTokenLockedValueUSD(parent.address);
    }

    @ResolveField()
    async secondTokenLockedValueUSD(
        @Parent() parent: PairModel,
    ): Promise<string> {
        return this.pairCompute.secondTokenLockedValueUSD(parent.address);
    }

    @ResolveField()
    async lockedValueUSD(@Parent() parent: PairModel): Promise<string> {
        return this.pairCompute.lockedValueUSD(parent.address);
    }

    @ResolveField()
    async previous24hLockedValueUSD(
        @Parent() parent: PairModel,
    ): Promise<string> {
        return this.pairCompute.previous24hLockedValueUSD(parent.address);
    }

    @ResolveField()
    async firstTokenVolume24h(@Parent() parent: PairModel): Promise<string> {
        return this.pairCompute.firstTokenVolume(parent.address, '24h');
    }

    @ResolveField()
    async secondTokenVolume24h(@Parent() parent: PairModel): Promise<string> {
        return this.pairCompute.secondTokenVolume(parent.address, '24h');
    }

    @ResolveField()
    async volumeUSD24h(@Parent() parent: PairModel): Promise<string> {
        return this.pairCompute.volumeUSD(parent.address, '24h');
    }

    @ResolveField()
    async previous24hVolumeUSD(@Parent() parent: PairModel): Promise<string> {
        return this.pairCompute.previous24hVolumeUSD(parent.address);
    }

    @ResolveField()
    async feesUSD24h(@Parent() parent: PairModel): Promise<string> {
        return this.pairCompute.feesUSD(parent.address, '24h');
    }

    @ResolveField()
    async previous24hFeesUSD(@Parent() parent: PairModel): Promise<string> {
        return this.pairCompute.previous24hFeesUSD(parent.address);
    }

    @ResolveField()
    async feesAPR(@Parent() parent: PairModel): Promise<string> {
        return this.pairCompute.feesAPR(parent.address);
    }

    @ResolveField()
    async info(@Parent() parent: PairModel): Promise<PairInfoModel> {
        return this.pairAbi.pairInfoMetadata(parent.address);
    }

    @ResolveField()
    async totalFeePercent(@Parent() parent: PairModel): Promise<number> {
        return this.pairAbi.totalFeePercent(parent.address);
    }

    @ResolveField()
    async specialFeePercent(@Parent() parent: PairModel): Promise<number> {
        return this.pairAbi.specialFeePercent(parent.address);
    }

    @ResolveField()
    async feesCollectorCutPercentage(
        @Parent() parent: PairModel,
    ): Promise<number> {
        const fees = await this.pairAbi.feesCollectorCutPercentage(
            parent.address,
        );
        return fees / constantsConfig.SWAP_FEE_PERCENT_BASE_POINTS;
    }

    @ResolveField()
    async type(@Parent() parent: PairModel): Promise<string> {
        return this.pairCompute.type(parent.address);
    }

    @ResolveField()
    async trustedSwapPairs(@Parent() parent: PairModel): Promise<string[]> {
        return this.pairAbi.trustedSwapPairs(parent.address);
    }

    @ResolveField()
    async state(@Parent() parent: PairModel): Promise<string> {
        return this.pairAbi.state(parent.address);
    }

    @ResolveField()
    async feeState(@Parent() parent: PairModel): Promise<boolean> {
        return this.pairAbi.feeState(parent.address);
    }

    @ResolveField()
    async lockedTokensInfo(
        @Parent() parent: PairModel,
    ): Promise<LockedTokensInfo> {
        return this.pairService.getLockedTokensInfo(parent.address);
    }

    @ResolveField()
    async whitelistedManagedAddresses(
        @Parent() parent: PairModel,
    ): Promise<string[]> {
        return this.pairAbi.whitelistedAddresses(parent.address);
    }

    @ResolveField()
    async initialLiquidityAdder(@Parent() parent: PairModel): Promise<string> {
        return this.pairAbi.initialLiquidityAdder(parent.address);
    }

    @ResolveField()
    async feeDestinations(
        @Parent() parent: PairModel,
    ): Promise<FeeDestination[]> {
        return this.pairAbi.feeDestinations(parent.address);
    }

    @ResolveField()
    async feesCollector(
        @Parent() parent: PairModel,
    ): Promise<FeesCollectorModel> {
        const feesCollectorAddress = await this.pairAbi.feesCollectorAddress(
            parent.address,
        );

        return feesCollectorAddress
            ? new FeesCollectorModel({
                  address: feesCollectorAddress,
              })
            : undefined;
    }

    @ResolveField()
    async hasFarms(@Parent() parent: PairModel): Promise<boolean> {
        return this.pairCompute.hasFarms(parent.address);
    }

    @ResolveField()
    async hasDualFarms(@Parent() parent: PairModel): Promise<boolean> {
        return this.pairCompute.hasDualFarms(parent.address);
    }

    @ResolveField()
    async tradesCount(@Parent() parent: PairModel): Promise<number> {
        return this.pairCompute.tradesCount(parent.address);
    }

    @ResolveField()
    async deployedAt(@Parent() parent: PairModel): Promise<number> {
        return this.pairCompute.deployedAt(parent.address);
    }

    @ResolveField(() => PairCompoundedAPRModel, { nullable: true })
    async compoundedAPR(
        @Parent() parent: PairModel,
    ): Promise<PairCompoundedAPRModel> {
        return new PairCompoundedAPRModel({ address: parent.address });
    }

    @ResolveField(() => PairRewardTokensModel, { nullable: true })
    async rewardTokens(
        @Parent() parent: PairModel,
    ): Promise<PairRewardTokensModel> {
        return new PairRewardTokensModel({ address: parent.address });
    }

    @ResolveField()
    async farmAddress(@Parent() parent: PairModel): Promise<string> {
        return await this.pairCompute.getPairFarmAddress(parent.address);
    }

    @ResolveField()
    async stakingProxyAddress(@Parent() parent: PairModel): Promise<string> {
        return await this.pairCompute.getPairStakingProxyAddress(
            parent.address,
        );
    }

    @Query(() => String)
    async getAmountOut(
        @Args('pairAddress') pairAddress: string,
        @Args('tokenInID') tokenInID: string,
        @Args('amount') amount: string,
    ): Promise<string> {
        return this.pairService.getAmountOut(pairAddress, tokenInID, amount);
    }

    @Query(() => String)
    async getAmountIn(
        @Args('pairAddress') pairAddress: string,
        @Args('tokenOutID') tokenOutID: string,
        @Args('amount') amount: string,
    ): Promise<string> {
        return this.pairService.getAmountIn(pairAddress, tokenOutID, amount);
    }

    @Query(() => String)
    async getEquivalent(
        @Args('pairAddress') pairAddress: string,
        @Args('tokenInID') tokenInID: string,
        @Args('amount') amount: string,
    ): Promise<string> {
        return (
            await this.pairService.getEquivalentForLiquidity(
                pairAddress,
                tokenInID,
                amount,
            )
        )
            .integerValue()
            .toFixed();
    }

    @Query(() => LiquidityPosition)
    async getLiquidityPosition(
        @Args('pairAddress') pairAddress: string,
        @Args('liquidityAmount') liquidityAmount: string,
    ): Promise<LiquidityPosition> {
        return this.pairService.getLiquidityPosition(
            pairAddress,
            liquidityAmount,
        );
    }

    @Query(() => Boolean)
    async getFeeState(
        @Args('pairAddress') pairAddress: string,
    ): Promise<boolean> {
        return this.pairAbi.feeState(pairAddress);
    }

    @Query(() => String)
    async getRouterManagedAddress(
        @Args('address') address: string,
    ): Promise<string> {
        return this.pairAbi.routerAddress(address);
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => [TransactionModel])
    async addInitialLiquidityBatch(
        @Args() args: AddLiquidityArgs,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel[]> {
        return this.transactionService.addInitialLiquidityBatch(
            user.address,
            args,
        );
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => [TransactionModel])
    async addLiquidityBatch(
        @Args() args: AddLiquidityArgs,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel[]> {
        return this.transactionService.addLiquidityBatch(user.address, args);
    }

    @Query(() => EsdtTokenPayment)
    async updateAndGetSafePrice(
        @Args('pairAddress') pairAddress: string,
        @Args('esdtTokenPayment') esdtTokenPayment: EsdtTokenPayment,
    ): Promise<EsdtTokenPayment> {
        return this.pairAbi.updateAndGetSafePrice(
            pairAddress,
            esdtTokenPayment,
        );
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => TransactionModel)
    async addLiquidity(
        @Args() args: AddLiquidityArgs,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        return this.transactionService.addLiquidity(user.address, args);
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => [TransactionModel])
    async removeLiquidity(
        @Args() args: RemoveLiquidityArgs,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel[]> {
        return this.transactionService.removeLiquidity(user.address, args);
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => TransactionModel)
    async swapTokensFixedInput(
        @Args() args: SwapTokensFixedInputArgs,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        return this.transactionService.swapTokensFixedInput(user.address, args);
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => TransactionModel)
    async swapTokensFixedOutput(
        @Args() args: SwapTokensFixedOutputArgs,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        return this.transactionService.swapTokensFixedOutput(
            user.address,
            args,
        );
    }

    @UseGuards(JwtOrNativeAdminGuard)
    @Query(() => TransactionModel)
    async whitelist(
        @Args() args: WhitelistArgs,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        await this.pairService.requireOwner(user.address);
        return this.transactionService.whitelist(args);
    }

    @UseGuards(JwtOrNativeAdminGuard)
    @Query(() => TransactionModel)
    async removeWhitelist(
        @Args() args: WhitelistArgs,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        await this.pairService.requireOwner(user.address);
        return this.transactionService.removeWhitelist(args);
    }

    @UseGuards(JwtOrNativeAdminGuard)
    @Query(() => TransactionModel)
    async addTrustedSwapPair(
        @Args('pairAddress') pairAddress: string,
        @Args('swapPairAddress') swapPairAddress: string,
        @Args('firstTokenID') firstTokenID: string,
        @Args('secondTokenID') secondTokenID: string,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        await this.pairService.requireOwner(user.address);
        return this.transactionService.addTrustedSwapPair(
            pairAddress,
            swapPairAddress,
            firstTokenID,
            secondTokenID,
        );
    }

    @UseGuards(JwtOrNativeAdminGuard)
    @Query(() => TransactionModel)
    async removeTrustedSwapPair(
        @Args('pairAddress') pairAddress: string,
        @Args('firstTokenID') firstTokenID: string,
        @Args('secondTokenID') secondTokenID: string,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        await this.pairService.requireOwner(user.address);
        return this.transactionService.removeTrustedSwapPair(
            pairAddress,
            firstTokenID,
            secondTokenID,
        );
    }

    @UseGuards(JwtOrNativeAdminGuard)
    @Query(() => TransactionModel)
    async pausePair(
        @Args('pairAddress') pairAddress: string,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        await this.pairService.requireOwner(user.address);
        return this.transactionService.pause(pairAddress);
    }

    @UseGuards(JwtOrNativeAdminGuard)
    @Query(() => TransactionModel)
    async resumePair(
        @Args('pairAddress') pairAddress: string,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        await this.pairService.requireOwner(user.address);
        return this.transactionService.resume(pairAddress);
    }

    @UseGuards(JwtOrNativeAdminGuard)
    @Query(() => TransactionModel)
    async setStateActiveNoSwaps(
        @Args('pairAddress') pairAddress: string,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        await this.pairService.requireOwner(user.address);
        return this.transactionService.setStateActiveNoSwaps(pairAddress);
    }

    @UseGuards(JwtOrNativeAdminGuard)
    @Query(() => TransactionModel)
    async setFeePercents(
        @Args('pairAddress') pairAddress: string,
        @Args('totalFeePercent') totalFeePercent: number,
        @Args('specialFeePercent') specialFeePercent: number,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        await this.pairService.requireOwner(user.address);
        return this.transactionService.setFeePercents(
            pairAddress,
            totalFeePercent,
            specialFeePercent,
        );
    }

    @UseGuards(JwtOrNativeAdminGuard)
    @Query(() => TransactionModel)
    async setLockingDeadlineEpoch(
        @Args('pairAddress') pairAddress: string,
        @Args('newDeadline') newDeadline: number,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        await this.pairService.requireOwner(user.address);
        return this.transactionService.setLockingDeadlineEpoch(
            pairAddress,
            newDeadline,
        );
    }

    @UseGuards(JwtOrNativeAdminGuard)
    @Query(() => TransactionModel)
    async setLockingScAddress(
        @Args('pairAddress') pairAddress: string,
        @Args('newAddress') newAddress: string,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        await this.pairService.requireOwner(user.address);
        return this.transactionService.setLockingScAddress(
            pairAddress,
            newAddress,
        );
    }

    @UseGuards(JwtOrNativeAdminGuard)
    @Query(() => TransactionModel)
    async setUnlockEpoch(
        @Args('pairAddress') pairAddress: string,
        @Args('newEpoch') newEpoch: number,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        await this.pairService.requireOwner(user.address);
        return this.transactionService.setUnlockEpoch(pairAddress, newEpoch);
    }

    @UseGuards(JwtOrNativeAdminGuard)
    @Query(() => TransactionModel, {
        description:
            'Generate transaction to set the fees collector address and fees cut percentage for a pair',
    })
    async setupFeesCollector(
        @Args('pairAddress') pairAddress: string,
    ): Promise<TransactionModel> {
        return this.transactionService.setupFeesCollector(pairAddress);
    }
}
