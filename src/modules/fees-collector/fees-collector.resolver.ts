import { Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
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
import { GenericResolver } from '../../services/generics/generic.resolver';
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

@Resolver(() => FeesCollectorModel)
export class FeesCollectorResolver extends GenericResolver {
    constructor(
        private readonly feesCollectorAbi: FeesCollectorAbiService,
        private readonly feesCollectorService: FeesCollectorService,
        private readonly weeklyRewardsSplittingAbi: WeeklyRewardsSplittingAbiService,
    ) {
        super();
    }

    @ResolveField()
    async lastGlobalUpdateWeek(
        @Parent() parent: FeesCollectorModel,
    ): Promise<number> {
        return await this.genericFieldResolver(() =>
            this.weeklyRewardsSplittingAbi.lastGlobalUpdateWeek(parent.address),
        );
    }

    @ResolveField(() => [GlobalInfoByWeekModel])
    async undistributedRewards(
        @Parent() parent: FeesCollectorModel,
    ): Promise<GlobalInfoByWeekModel[]> {
        return this.feesCollectorService.getWeeklyRewardsSplit(
            parent.address,
            parent.startWeek,
            parent.endWeek,
        );
    }

    @ResolveField(() => [EsdtTokenPayment])
    async accumulatedFees(
        @Parent() parent: FeesCollectorModel,
    ): Promise<EsdtTokenPayment[]> {
        return await this.genericFieldResolver(() =>
            this.feesCollectorService.getAccumulatedFees(
                parent.address,
                parent.time.currentWeek,
                parent.allTokens,
            ),
        );
    }

    @ResolveField()
    async lockedTokenId(): Promise<string> {
        return await this.genericFieldResolver(() =>
            this.feesCollectorAbi.lockedTokenID(),
        );
    }

    @ResolveField()
    async lockedTokensPerBlock(): Promise<string> {
        return await this.genericFieldResolver(() =>
            this.feesCollectorAbi.lockedTokensPerBlock(),
        );
    }

    @Query(() => FeesCollectorModel)
    async feesCollector(): Promise<FeesCollectorModel> {
        return await this.genericQuery(() =>
            this.feesCollectorService.feesCollector(scAddress.feesCollector),
        );
    }
}

@Resolver(() => UserEntryFeesCollectorModel)
export class UserEntryFeesCollectorResolver extends GenericResolver {
    constructor(
        private readonly feesCollectorService: FeesCollectorService,
        private readonly weeklyRewardsSplittingAbi: WeeklyRewardsSplittingAbiService,
    ) {
        super();
    }

    @ResolveField(() => [UserInfoByWeekModel])
    async undistributedRewards(
        @Parent() parent: UserEntryFeesCollectorModel,
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
        @Parent() parent: UserEntryFeesCollectorModel,
    ): Promise<EsdtTokenPayment[]> {
        return this.feesCollectorService.getUserAccumulatedRewards(
            parent.address,
            parent.userAddress,
            parent.time.currentWeek,
        );
    }

    @ResolveField()
    async lastActiveWeekForUser(
        @Parent() parent: UserEntryFeesCollectorModel,
    ): Promise<number> {
        return await this.genericFieldResolver(() =>
            this.weeklyRewardsSplittingAbi.lastActiveWeekForUser(
                parent.address,
                parent.userAddress,
            ),
        );
    }

    @ResolveField(() => ClaimProgress)
    async claimProgress(
        @Parent() parent: UserEntryFeesCollectorModel,
    ): Promise<ClaimProgress> {
        return await this.genericFieldResolver(() =>
            this.weeklyRewardsSplittingAbi.currentClaimProgress(
                parent.address,
                parent.userAddress,
            ),
        );
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => UserEntryFeesCollectorModel)
    async userFeesCollector(
        @AuthUser() user: UserAuthResult,
    ): Promise<UserEntryFeesCollectorModel> {
        return await this.genericQuery(() =>
            this.feesCollectorService.userFeesCollector(
                scAddress.feesCollector,
                user.address,
            ),
        );
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => FeesCollectorTransactionModel)
    async claimFeesRewards(
        @AuthUser() user: UserAuthResult,
    ): Promise<FeesCollectorTransactionModel> {
        return await this.genericQuery(() =>
            this.feesCollectorService.claimRewardsBatch(
                scAddress.feesCollector,
                user.address,
            ),
        );
    }

    @UseGuards(JwtOrNativeAuthGuard)
    @Query(() => TransactionModel)
    async updateEnergyForUser(
        @AuthUser() user: UserAuthResult,
    ): Promise<TransactionModel> {
        return await this.genericQuery(() =>
            this.feesCollectorService.updateEnergyForUser(user.address),
        );
    }
}
