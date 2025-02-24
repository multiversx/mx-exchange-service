import { Args, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import {
    FeesCollectorModel,
    FeesCollectorTransactionModel,
    UserEntryFeesCollectorModel,
} from './models/fees-collector.model';
import { FeesCollectorService } from './services/fees-collector.service';
import { AuthUser } from '../auth/auth.user';
import { UserAuthResult } from '../auth/user.auth.result';
import { UseGuards } from '@nestjs/common';
import { JwtOrNativeAuthGuard } from '../auth/jwt.or.native.auth.guard';
import { scAddress } from '../../config';
import { EsdtTokenPayment } from '../../models/esdtTokenPayment.model';
import {
    ClaimProgress,
    GlobalInfoByWeekModel,
    UserInfoByWeekModel,
} from '../../submodules/weekly-rewards-splitting/models/weekly-rewards-splitting.model';
import { TransactionModel } from '../../models/transaction.model';
import { FeesCollectorAbiService } from './services/fees-collector.abi.service';
import { WeeklyRewardsSplittingAbiService } from 'src/submodules/weekly-rewards-splitting/services/weekly-rewards-splitting.abi.service';
import { FeesCollectorTransactionService } from './services/fees-collector.transaction.service';
import { FeesCollectorComputeService } from './services/fees-collector.compute.service';
import { JwtOrNativeAdminGuard } from '../auth/jwt.or.native.admin.guard';

@Resolver(() => FeesCollectorModel)
export class FeesCollectorResolver {
    constructor(
        private readonly feesCollectorAbi: FeesCollectorAbiService,
        private readonly feesCollectorService: FeesCollectorService,
        private readonly feesCollectorTransaction: FeesCollectorTransactionService,
        private readonly weeklyRewardsSplittingAbi: WeeklyRewardsSplittingAbiService,
    ) {}

    @ResolveField()
    async lastGlobalUpdateWeek(parent: FeesCollectorModel): Promise<number> {
        return this.weeklyRewardsSplittingAbi.lastGlobalUpdateWeek(
            parent.address,
        );
    }

    @ResolveField(() => [GlobalInfoByWeekModel])
    async undistributedRewards(
        parent: FeesCollectorModel,
    ): Promise<GlobalInfoByWeekModel[]> {
        return this.feesCollectorService.getWeeklyRewardsSplit(
            parent.address,
            parent.startWeek,
            parent.endWeek,
        );
    }

    @ResolveField(() => [EsdtTokenPayment])
    async accumulatedFees(
        parent: FeesCollectorModel,
    ): Promise<EsdtTokenPayment[]> {
        return this.feesCollectorService.getAccumulatedFees(
            parent.address,
            parent.time.currentWeek,
            parent.allTokens,
        );
    }

    @ResolveField()
    async lockedTokenId(): Promise<string> {
        return this.feesCollectorAbi.lockedTokenID();
    }

    @ResolveField()
    async lockedTokensPerBlock(): Promise<string> {
        return this.feesCollectorAbi.lockedTokensPerBlock();
    }

    @ResolveField(() => [String])
    async allTokens(): Promise<string[]> {
        return this.feesCollectorAbi.allTokens();
    }

    @ResolveField(() => [String])
    async knownContracts(): Promise<string[]> {
        return this.feesCollectorAbi.knownContracts();
    }

    @Query(() => FeesCollectorModel)
    async feesCollector(): Promise<FeesCollectorModel> {
        return this.feesCollectorService.feesCollector(scAddress.feesCollector);
    }

    @UseGuards(JwtOrNativeAdminGuard)
    @Query(() => TransactionModel, {
        description: 'Add or remove known contracts',
    })
    async handleKnownContracts(
        @Args('contractAddresses', { type: () => [String] })
        contractAddresses: string[],
        @Args('remove', { nullable: true }) remove: boolean,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        return this.feesCollectorTransaction.handleKnownContracts(
            user.address,
            contractAddresses,
            remove,
        );
    }

    @UseGuards(JwtOrNativeAdminGuard)
    @Query(() => TransactionModel, {
        description: 'Add or remove known tokens',
    })
    async handleKnownTokens(
        @Args('tokenIDs', { type: () => [String] }) tokenIDs: string[],
        @Args('remove', { nullable: true }) remove: boolean,
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        return this.feesCollectorTransaction.handleKnownTokens(
            user.address,
            tokenIDs,
            remove,
        );
    }
}

@Resolver(() => UserEntryFeesCollectorModel)
export class UserEntryFeesCollectorResolver {
    constructor(
        private readonly feesCollectorService: FeesCollectorService,
        private readonly feesCollectorCompute: FeesCollectorComputeService,
        private readonly feesCollectorTransaction: FeesCollectorTransactionService,
        private readonly weeklyRewardsSplittingAbi: WeeklyRewardsSplittingAbiService,
    ) {}

    @ResolveField(() => [UserInfoByWeekModel])
    async undistributedRewards(
        parent: UserEntryFeesCollectorModel,
    ): Promise<UserInfoByWeekModel[]> {
        return this.feesCollectorService.getUserWeeklyRewardsSplit(
            parent.address,
            parent.userAddress,
            parent.startWeek,
            parent.endWeek,
        );
    }

    @ResolveField(() => [EsdtTokenPayment])
    async accumulatedRewards(
        parent: UserEntryFeesCollectorModel,
    ): Promise<EsdtTokenPayment[]> {
        return this.feesCollectorService.getUserAccumulatedRewards(
            parent.address,
            parent.userAddress,
            parent.time.currentWeek,
        );
    }

    @ResolveField()
    async lastActiveWeekForUser(
        parent: UserEntryFeesCollectorModel,
    ): Promise<number> {
        return this.weeklyRewardsSplittingAbi.lastActiveWeekForUser(
            parent.address,
            parent.userAddress,
        );
    }

    @ResolveField(() => ClaimProgress)
    async claimProgress(
        parent: UserEntryFeesCollectorModel,
    ): Promise<ClaimProgress> {
        return this.weeklyRewardsSplittingAbi.currentClaimProgress(
            parent.address,
            parent.userAddress,
        );
    }

    @ResolveField()
    async lastWeekRewardsUSD(
        @Parent() parent: UserEntryFeesCollectorModel,
        @Args('additionalUserEnergy', { nullable: true })
        additionalUserEnergy: string,
    ): Promise<string> {
        return this.feesCollectorCompute.computeUserLastWeekRewardsUSD(
            scAddress.feesCollector,
            parent.userAddress,
            additionalUserEnergy,
        );
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => UserEntryFeesCollectorModel)
    async userFeesCollector(
        @AuthUser() user: UserAuthResult,
    ): Promise<UserEntryFeesCollectorModel> {
        return this.feesCollectorService.userFeesCollector(
            scAddress.feesCollector,
            user.address,
        );
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => FeesCollectorTransactionModel)
    async claimFeesRewards(
        @AuthUser() user: UserAuthResult,
    ): Promise<FeesCollectorTransactionModel> {
        return this.feesCollectorTransaction.claimRewardsBatch(
            scAddress.feesCollector,
            user.address,
        );
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => TransactionModel)
    async updateEnergyForUser(
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        return this.feesCollectorTransaction.updateEnergyForUser(user.address);
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => String)
    async userLastWeekRewards(
        @AuthUser() user: UserAuthResult,
        @Args('energyAmount', { nullable: true })
        energyAmount: string,
        @Args('lockedTokens', { nullable: true })
        lockedTokens: string,
    ): Promise<string> {
        const apr = await this.feesCollectorCompute.computeUserRewardsAPR(
            scAddress.feesCollector,
            user.address,
            energyAmount,
            lockedTokens,
        );
        return apr.toFixed(4);
    }
}
