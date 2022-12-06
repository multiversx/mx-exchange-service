import { Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import {
    FeesCollectorModel,
    FeesCollectorTransactionModel,
    UserEntryFeesCollectorModel
} from './models/fees-collector.model';
import { FeesCollectorService } from './services/fees-collector.service';
import { User } from '../../helpers/userDecorator';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../auth/gql.auth.guard';
import { GenericResolver } from '../../services/generics/generic.resolver';
import { scAddress } from '../../config';
import { EsdtTokenPayment } from '../../models/esdtTokenPayment.model';
import {
    WeeklyRewardsSplittingGetterService
} from '../../submodules/weekly-rewards-splitting/services/weekly-rewards-splitting.getter.service';
import {
    GlobalInfoByWeekModel, UserInfoByWeekModel,
} from '../../submodules/weekly-rewards-splitting/models/weekly-rewards-splitting.model';
import { Mixin } from 'ts-mixer';
import {
    GlobalInfoByWeekSubResolver, UserInfoByWeekSubResolver
} from '../../submodules/weekly-rewards-splitting/weekly-rewards-splitting.resolver';
import { TransactionModel } from '../../models/transaction.model';
import { FeesCollectorGetterService } from './services/fees-collector.getter.service';

@Resolver(() => FeesCollectorModel)
export class FeesCollectorResolver extends Mixin(GenericResolver, GlobalInfoByWeekSubResolver) {
    constructor(
        private readonly feesCollectorService: FeesCollectorService,
        private readonly feesCollectorGetter: FeesCollectorGetterService,
        protected readonly weeklyRewardsSplittingGetter: WeeklyRewardsSplittingGetterService,
    ) {
        super(weeklyRewardsSplittingGetter);
    }

    @ResolveField(() => [GlobalInfoByWeekModel])
    async undistributedRewards(@Parent() parent: FeesCollectorModel): Promise<GlobalInfoByWeekModel[]> {
        return this.feesCollectorService.getWeeklyRewardsSplit(parent.address, parent.startWeek, parent.endWeek);
    }

    @ResolveField(() => [EsdtTokenPayment])
    async accumulatedFees(@Parent() parent: FeesCollectorModel): Promise<EsdtTokenPayment[]> {
        return await this.genericFieldResolver(() =>
            this.feesCollectorService.getAccumulatedFees(parent.address, parent.time.currentWeek, parent.allTokens),
        );
    }

    @ResolveField()
    async lockedTokenId(@Parent() parent: FeesCollectorModel): Promise<string> {
        return await this.genericFieldResolver(() =>
            this.feesCollectorGetter.getLockedTokenId(parent.address),
        );
    }

    @ResolveField()
    async lockedTokensPerBlock(@Parent() parent: FeesCollectorModel): Promise<string> {
        return await this.genericFieldResolver(() =>
            this.feesCollectorGetter.getLockedTokensPerBlock(parent.address),
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
export class UserEntryFeesCollectorResolver extends Mixin(GenericResolver, UserInfoByWeekSubResolver) {
    constructor(
        private readonly feesCollectorService: FeesCollectorService,
        protected readonly weeklyRewardsSplittingGetter: WeeklyRewardsSplittingGetterService,
    ) {
        super(weeklyRewardsSplittingGetter);
    }

    @ResolveField(() => [UserInfoByWeekModel])
    async undistributedRewards(
        @Parent() parent: UserEntryFeesCollectorModel,
    ): Promise<UserInfoByWeekModel[]> {
        return this.feesCollectorService.getUserWeeklyRewardsSplit(parent.address, parent.userAddress, parent.startWeek, parent.endWeek);
    }

    @ResolveField(() => [EsdtTokenPayment])
    async accumulatedRewards(
        @Parent() parent: UserEntryFeesCollectorModel,
    ): Promise<EsdtTokenPayment[]> {
        return this.feesCollectorService.getUserAccumulatedRewards(parent.address, parent.userAddress, parent.time.currentWeek);
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => UserEntryFeesCollectorModel)
    async userFeesCollector(
        @User() user: any
    ): Promise<UserEntryFeesCollectorModel> {
        return await this.genericQuery(() =>
            this.feesCollectorService.userFeesCollector(scAddress.feesCollector, user.publicKey),
        );
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => FeesCollectorTransactionModel)
    async claimFeesRewards(
        @User() user: any,
    ): Promise<FeesCollectorTransactionModel> {
        return await this.genericQuery(() =>
            this.feesCollectorService.claimRewardsBatch(scAddress.feesCollector, user.publicKey),
        );
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => TransactionModel)
    async updateEnergyForUser(
        @User() user: any,
    ): Promise<TransactionModel> {
        return await this.genericQuery(() =>
            this.feesCollectorService.updateEnergyForUser(user.publicKey),
        );
    }
}
