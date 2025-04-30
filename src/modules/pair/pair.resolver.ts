import { PairService } from './services/pair.service';
import { Resolver, Query, ResolveField, Args } from '@nestjs/graphql';
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
import { GenericResolver } from 'src/services/generics/generic.resolver';
import { FarmComputeServiceV2 } from '../farm/v2/services/farm.v2.compute.service';
import { StakingComputeService } from '../staking/services/staking.compute.service';
import { StakingProxyService } from '../staking-proxy/services/staking.proxy.service';
import { NftCollection } from '../tokens/models/nftCollection.model';
import { EnergyService } from '../energy/services/energy.service';
import { PairAbiLoader } from './services/pair.abi.loader';
import { PairComputeLoader } from './services/pair.compute.loader';

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
    async poolRewards(parent: PairRewardTokensModel): Promise<EsdtToken[]> {
        return Promise.all([
            this.pairService.getFirstToken(parent.address),
            this.pairService.getSecondToken(parent.address),
        ]);
    }

    @ResolveField()
    async farmReward(parent: PairRewardTokensModel): Promise<NftCollection> {
        const farmAddress = await this.pairCompute.getPairFarmAddress(
            parent.address,
        );

        if (!farmAddress) {
            return undefined;
        }

        return this.energyService.getLockedToken();
    }

    @ResolveField()
    async dualFarmReward(parent: PairRewardTokensModel): Promise<EsdtToken> {
        const stakingProxyAddress =
            await this.pairCompute.getPairStakingProxyAddress(parent.address);

        if (!stakingProxyAddress) {
            return undefined;
        }

        return this.stakingProxyService.getStakingToken(stakingProxyAddress);
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
    async feesAPR(parent: PairCompoundedAPRModel): Promise<string> {
        return this.pairCompute.feesAPR(parent.address);
    }

    @ResolveField(() => String)
    async farmBaseAPR(parent: PairCompoundedAPRModel): Promise<string> {
        const farmAddress = await this.pairCompute.getPairFarmAddress(
            parent.address,
        );

        if (!farmAddress) {
            return '0';
        }

        return this.farmCompute.farmBaseAPR(farmAddress);
    }

    @ResolveField(() => String)
    async farmBoostedAPR(parent: PairCompoundedAPRModel): Promise<string> {
        const farmAddress = await this.pairCompute.getPairFarmAddress(
            parent.address,
        );

        if (!farmAddress) {
            return '0';
        }

        return this.farmCompute.maxBoostedApr(farmAddress);
    }

    @ResolveField(() => String)
    async dualFarmBaseAPR(parent: PairCompoundedAPRModel): Promise<string> {
        const stakingAddress = await this.pairCompute.getPairStakingFarmAddress(
            parent.address,
        );

        if (!stakingAddress) {
            return '0';
        }

        return this.stakingCompute.stakeFarmBaseAPR(stakingAddress);
    }

    @ResolveField(() => String)
    async dualFarmBoostedAPR(parent: PairCompoundedAPRModel): Promise<string> {
        const stakingAddress = await this.pairCompute.getPairStakingFarmAddress(
            parent.address,
        );

        if (!stakingAddress) {
            return '0';
        }

        return this.stakingCompute.maxBoostedAPR(stakingAddress);
    }
}

@Resolver(() => PairModel)
export class PairResolver {
    constructor(
        private readonly pairService: PairService,
        private readonly pairAbi: PairAbiService,
        private readonly pairCompute: PairComputeService,
        private readonly transactionService: PairTransactionService,
        private readonly pairAbiLoader: PairAbiLoader,
        private readonly pairComputeLoader: PairComputeLoader,
    ) {}

    @ResolveField()
    async firstToken(parent: PairModel): Promise<EsdtToken> {
        return this.pairAbiLoader.firstTokenLoader.load(parent.address);
    }

    @ResolveField()
    async secondToken(parent: PairModel): Promise<EsdtToken> {
        return this.pairAbiLoader.secondTokenLoader.load(parent.address);
    }

    @ResolveField()
    async liquidityPoolToken(parent: PairModel): Promise<EsdtToken> {
        return this.pairAbiLoader.liquidityPoolTokenLoader.load(parent.address);
    }

    @ResolveField()
    async firstTokenPrice(parent: PairModel): Promise<string> {
        return this.pairComputeLoader.firstTokenPriceLoader.load(
            parent.address,
        );
    }

    @ResolveField()
    async firstTokenPriceUSD(parent: PairModel): Promise<string> {
        return this.pairComputeLoader.firstTokenPriceUSDLoader.load(
            parent.address,
        );
    }

    @ResolveField()
    async secondTokenPriceUSD(parent: PairModel): Promise<string> {
        return this.pairComputeLoader.secondTokenPriceUSDLoader.load(
            parent.address,
        );
    }

    @ResolveField()
    async secondTokenPrice(parent: PairModel): Promise<string> {
        return this.pairComputeLoader.secondTokenPriceLoader.load(
            parent.address,
        );
    }

    @ResolveField()
    async liquidityPoolTokenPriceUSD(parent: PairModel): Promise<string> {
        return this.pairComputeLoader.lpTokenPriceUSDLoader.load(
            parent.address,
        );
    }

    @ResolveField()
    async firstTokenLockedValueUSD(parent: PairModel): Promise<string> {
        return this.pairComputeLoader.firstTokenLockedValueUSDLoader.load(
            parent.address,
        );
    }

    @ResolveField()
    async secondTokenLockedValueUSD(parent: PairModel): Promise<string> {
        return this.pairComputeLoader.secondTokenLockedValueUSDLoader.load(
            parent.address,
        );
    }

    @ResolveField()
    async lockedValueUSD(parent: PairModel): Promise<string> {
        return this.pairComputeLoader.lockedValueUSDLoader.load(parent.address);
    }

    @ResolveField()
    async previous24hLockedValueUSD(parent: PairModel): Promise<string> {
        return this.pairComputeLoader.previous24hLockedValueUSDLoader.load(
            parent.address,
        );
    }

    @ResolveField()
    async firstTokenVolume24h(parent: PairModel): Promise<string> {
        return this.pairComputeLoader.firstTokenVolumeLoader.load(
            parent.address,
        );
    }

    @ResolveField()
    async secondTokenVolume24h(parent: PairModel): Promise<string> {
        return this.pairComputeLoader.secondTokenVolumeLoader.load(
            parent.address,
        );
    }

    @ResolveField()
    async volumeUSD24h(parent: PairModel): Promise<string> {
        return this.pairComputeLoader.volumeUSD24hLoader.load(parent.address);
    }

    @ResolveField()
    async previous24hVolumeUSD(parent: PairModel): Promise<string> {
        return this.pairComputeLoader.previous24hVolumeUSDLoader.load(
            parent.address,
        );
    }

    @ResolveField()
    async feesUSD24h(parent: PairModel): Promise<string> {
        return this.pairCompute.feesUSD(parent.address, '24h');
    }

    @ResolveField()
    async previous24hFeesUSD(parent: PairModel): Promise<string> {
        return this.pairComputeLoader.previous24hFeesUSDLoader.load(
            parent.address,
        );
    }

    @ResolveField()
    async feesAPR(parent: PairModel): Promise<string> {
        return this.pairComputeLoader.feesAPRLoader.load(parent.address);
    }

    @ResolveField()
    async info(parent: PairModel): Promise<PairInfoModel> {
        return this.pairAbiLoader.infoMetadataLoader.load(parent.address);
    }

    @ResolveField()
    async totalFeePercent(parent: PairModel): Promise<number> {
        return this.pairAbiLoader.totalFeePercentLoader.load(parent.address);
    }

    @ResolveField()
    async specialFeePercent(parent: PairModel): Promise<number> {
        return this.pairAbiLoader.specialFeePercentLoader.load(parent.address);
    }

    @ResolveField()
    async feesCollectorCutPercentage(parent: PairModel): Promise<number> {
        return this.pairAbiLoader.feesCollectorCutPercentageLoader.load(
            parent.address,
        );
    }

    @ResolveField()
    async type(parent: PairModel): Promise<string> {
        return this.pairComputeLoader.typeLoader.load(parent.address);
    }

    @ResolveField()
    async trustedSwapPairs(parent: PairModel): Promise<string[]> {
        return this.pairAbi.trustedSwapPairs(parent.address);
    }

    @ResolveField()
    async state(parent: PairModel): Promise<string> {
        return this.pairAbiLoader.stateLoader.load(parent.address);
    }

    @ResolveField()
    async feeState(parent: PairModel): Promise<boolean> {
        return this.pairAbiLoader.feeStateLoader.load(parent.address);
    }

    @ResolveField()
    async lockedTokensInfo(parent: PairModel): Promise<LockedTokensInfo> {
        return this.pairService.getLockedTokensInfo(parent.address);
    }

    @ResolveField()
    async whitelistedManagedAddresses(parent: PairModel): Promise<string[]> {
        return this.pairAbi.whitelistedAddresses(parent.address);
    }

    @ResolveField()
    async initialLiquidityAdder(parent: PairModel): Promise<string> {
        return this.pairAbi.initialLiquidityAdder(parent.address);
    }

    @ResolveField()
    async feeDestinations(parent: PairModel): Promise<FeeDestination[]> {
        return this.pairAbi.feeDestinations(parent.address);
    }

    @ResolveField()
    async feesCollector(parent: PairModel): Promise<FeesCollectorModel> {
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
    async hasFarms(parent: PairModel): Promise<boolean> {
        return this.pairComputeLoader.hasFarmsLoader.load(parent.address);
    }

    @ResolveField()
    async hasDualFarms(parent: PairModel): Promise<boolean> {
        return this.pairComputeLoader.hasDualFarmsLoader.load(parent.address);
    }

    @ResolveField()
    async tradesCount(parent: PairModel): Promise<number> {
        return this.pairComputeLoader.tradesCountLoader.load(parent.address);
    }

    @ResolveField()
    async tradesCount24h(parent: PairModel): Promise<number> {
        return this.pairComputeLoader.tradesCount24hLoader.load(parent.address);
    }

    @ResolveField()
    async deployedAt(parent: PairModel): Promise<number> {
        return this.pairComputeLoader.deployedAtLoader.load(parent.address);
    }

    @ResolveField(() => PairCompoundedAPRModel, { nullable: true })
    async compoundedAPR(parent: PairModel): Promise<PairCompoundedAPRModel> {
        return new PairCompoundedAPRModel({ address: parent.address });
    }

    @ResolveField(() => PairRewardTokensModel, { nullable: true })
    async rewardTokens(parent: PairModel): Promise<PairRewardTokensModel> {
        return new PairRewardTokensModel({ address: parent.address });
    }

    @ResolveField()
    async farmAddress(parent: PairModel): Promise<string> {
        return this.pairCompute.getPairFarmAddress(parent.address);
    }

    @ResolveField()
    async stakingProxyAddress(parent: PairModel): Promise<string> {
        return this.pairCompute.getPairStakingProxyAddress(parent.address);
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
        return this.transactionService.whitelist(user.address, args);
    }

    @UseGuards(JwtOrNativeAdminGuard)
    @Query(() => TransactionModel)
    async removeWhitelist(
        @Args() args: WhitelistArgs,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        await this.pairService.requireOwner(user.address);
        return this.transactionService.removeWhitelist(user.address, args);
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
            user.address,
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
            user.address,
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
        return this.transactionService.pause(user.address, pairAddress);
    }

    @UseGuards(JwtOrNativeAdminGuard)
    @Query(() => TransactionModel)
    async resumePair(
        @Args('pairAddress') pairAddress: string,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        await this.pairService.requireOwner(user.address);
        return this.transactionService.resume(user.address, pairAddress);
    }

    @UseGuards(JwtOrNativeAdminGuard)
    @Query(() => TransactionModel)
    async setStateActiveNoSwaps(
        @Args('pairAddress') pairAddress: string,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        await this.pairService.requireOwner(user.address);
        return this.transactionService.setStateActiveNoSwaps(
            user.address,
            pairAddress,
        );
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
            user.address,
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
            user.address,
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
            user.address,
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
        return this.transactionService.setUnlockEpoch(
            user.address,
            pairAddress,
            newEpoch,
        );
    }

    @UseGuards(JwtOrNativeAdminGuard)
    @Query(() => TransactionModel, {
        description:
            'Generate transaction to set the fees collector address and fees cut percentage for a pair',
    })
    async setupFeesCollector(
        @Args('pairAddress') pairAddress: string,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        return this.transactionService.setupFeesCollector(
            user.address,
            pairAddress,
        );
    }
}
