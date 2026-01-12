import { PairService } from './services/pair.service';
import { Resolver, Query, ResolveField, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import {
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
import { EsdtTokenPayment } from 'src/models/esdtTokenPayment.model';
import { EsdtToken } from '../tokens/models/esdtToken.model';
import { PairAbiService } from './services/pair.abi.service';
import { JwtOrNativeAdminGuard } from '../auth/jwt.or.native.admin.guard';
import { FeesCollectorModel } from '../fees-collector/models/fees-collector.model';
import { StateDataLoader } from '../dex-state/services/state.dataloader';
import { SimpleLockModel } from '../simple-lock/models/simple.lock.model';

@Resolver(() => PairModel)
export class PairResolver {
    constructor(
        private readonly pairService: PairService,
        private readonly pairAbi: PairAbiService,
        private readonly transactionService: PairTransactionService,
        private readonly stateDataLoader: StateDataLoader,
    ) {}

    @ResolveField()
    async firstToken(parent: PairModel): Promise<EsdtToken> {
        return this.stateDataLoader.loadToken(parent.firstTokenId);
    }

    @ResolveField()
    async secondToken(parent: PairModel): Promise<EsdtToken> {
        return this.stateDataLoader.loadToken(parent.secondTokenId);
    }

    @ResolveField()
    async liquidityPoolToken(parent: PairModel): Promise<EsdtToken> {
        if (parent.liquidityPoolTokenId) {
            return this.stateDataLoader.loadToken(parent.liquidityPoolTokenId);
        }

        return undefined;
    }

    @ResolveField()
    async type(): Promise<string> {
        return 'Ecosystem';
    }

    @ResolveField()
    async lockedTokensInfo(parent: PairModel): Promise<LockedTokensInfo> {
        if (parent.lockedTokensInfo) {
            return new LockedTokensInfo({
                lockingSC: new SimpleLockModel({
                    address: parent.lockedTokensInfo.lockingScAddress,
                }),
                ...parent.lockedTokensInfo,
            });
        }

        return undefined;
    }

    @ResolveField()
    async feesCollector(parent: PairModel): Promise<FeesCollectorModel> {
        // TODO : add fees collector data loader
        if (parent.feesCollectorAddress) {
            return new FeesCollectorModel({
                address: parent.feesCollectorAddress,
            });
        }
        return undefined;
    }

    @ResolveField(() => PairCompoundedAPRModel, { nullable: true })
    compoundedAPR(parent: PairModel): PairCompoundedAPRModel {
        return new PairCompoundedAPRModel({
            address: parent.address,
            ...parent.compoundedAPR,
        });
    }

    @ResolveField(() => PairRewardTokensModel, { nullable: true })
    async rewardTokens(parent: PairModel): Promise<PairRewardTokensModel> {
        const promises = [];
        promises.push(this.stateDataLoader.loadToken(parent.firstTokenId));
        promises.push(this.stateDataLoader.loadToken(parent.secondTokenId));
        promises.push(
            parent.hasFarms
                ? this.stateDataLoader.loadNft(parent.farmRewardCollection)
                : Promise.resolve(undefined),
        );
        promises.push(
            parent.hasDualFarms
                ? this.stateDataLoader.loadToken(parent.dualFarmRewardTokenId)
                : Promise.resolve(undefined),
        );

        const rewards = await Promise.all(promises);

        return new PairRewardTokensModel({
            address: parent.address,
            poolRewards: [rewards[0], rewards[1]],
            farmReward: rewards[2],
            dualFarmReward: rewards[3],
        });
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
