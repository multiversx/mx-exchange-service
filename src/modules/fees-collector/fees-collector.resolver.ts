import { Args, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { FeesCollectorModel, UserEntryFeesCollectorModel } from './models/fees-collector.model';
import { FeesCollectorService } from './services/fees-collector.service';
import { User } from '../../helpers/userDecorator';
import { Injectable, UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../auth/gql.auth.guard';
import { GenericResolver } from '../../services/generics/generic.resolver';
import { scAddress } from '../../config';
import { EsdtTokenPayment } from '../../models/esdtTokenPayment.model';
import {
    WeeklyRewardsSplittingGetterService
} from '../../submodules/weekly-rewards-splitting/services/weekly-rewards-splitting.getter.service';
import {
    ClaimProgress,
    GlobalInfoByWeekModel, UserInfoByWeekModel, WeekFilterPeriodModel,
} from '../../submodules/weekly-rewards-splitting/models/weekly-rewards-splitting.model';
import { AbstractWeekValidation } from '../../submodules/week-timekeeping/validationPipes/week-timekeeping.validation';
import { FeesCollectorComputeService } from "./services/fees-collector.compute.service";

@Injectable()
export class FeesCollectorWeekValidation extends AbstractWeekValidation {
    address = scAddress.feesCollector;
}

@Resolver(() => FeesCollectorModel)
export class FeesCollectorResolver extends GenericResolver {
    constructor(
        private readonly feesCollectorService: FeesCollectorService,
        private readonly feesCollectorCompute: FeesCollectorComputeService,
        protected readonly weeklyRewardsSplittingGetter: WeeklyRewardsSplittingGetterService,
    ) {
        super();
    }

    @ResolveField(() => [GlobalInfoByWeekModel])
    async undistributedRewards(@Parent() parent: FeesCollectorModel): Promise<GlobalInfoByWeekModel[]> {
        return this.feesCollectorService.getWeeklyRewardsSplit(parent.address, parent.startWeek, parent.endWeek);
    }

    @ResolveField(() => [EsdtTokenPayment])
    async accumulatedFees(@Parent() parent: FeesCollectorModel): Promise<EsdtTokenPayment[]> {
        return await this.genericFieldResover(() =>
            this.feesCollectorService.getAccumulatedFees(parent.address, parent.time.currentWeek, parent.allTokens),
        );
    }

    @ResolveField()
    async apr(@Parent() parent: FeesCollectorModel): Promise<string> {
        return await this.genericFieldResover(() =>
            this.feesCollectorCompute.computeApr(parent.address, parent.time.currentWeek),
        );
    }

    @ResolveField()
    async lastGlobalUpdateWeek(
        @Parent() parent: FeesCollectorModel,
    ): Promise<number> {
        return await this.genericFieldResover(() =>
            this.weeklyRewardsSplittingGetter.lastGlobalUpdateWeek(parent.address),
        );
    }

    @ResolveField(() => ClaimProgress)
    async claimProgress(
        @Parent() parent: UserEntryFeesCollectorModel,
    ): Promise<ClaimProgress> {
        return await this.genericFieldResover(() =>
            this.weeklyRewardsSplittingGetter.currentClaimProgress(parent.address, parent.userAddress),
        );
    }

    @Query(() => FeesCollectorModel)
    async feesCollector(
        @Args('weekFilter', { nullable: true }, FeesCollectorWeekValidation) weekFilter: WeekFilterPeriodModel,
    ): Promise<FeesCollectorModel> {
        return await this.genericQuery(() =>
            this.feesCollectorService.feesCollector(scAddress.feesCollector, weekFilter),
        );
    }
}


@Resolver(() => UserEntryFeesCollectorModel)
export class UserEntryFeesCollectorResolver extends GenericResolver {
    constructor(
        private readonly feesCollectorService: FeesCollectorService,
        protected readonly weeklyRewardsSplittingGetter: WeeklyRewardsSplittingGetterService,
    ) {
        super();
    }

    @ResolveField()
    async lastActiveWeekForUser(
        @Parent() parent: UserEntryFeesCollectorModel,
    ): Promise<number> {
        return await this.genericFieldResover(() =>
            this.weeklyRewardsSplittingGetter.lastActiveWeekForUser(parent.address, parent.userAddress)
        );
    }

    @ResolveField(() => [UserInfoByWeekModel])
    async undistributedRewards(
        @Parent() parent: UserEntryFeesCollectorModel,
    ): Promise<UserInfoByWeekModel[]> {
        return this.feesCollectorService.getUserWeeklyRewardsSplit(parent.address, parent.userAddress, parent.startWeek, parent.endWeek);
    }

    @ResolveField(() => ClaimProgress)
    async claimProgress(
        @Parent() parent: UserEntryFeesCollectorModel,
    ): Promise<ClaimProgress> {
        return await this.genericFieldResover(() =>
            this.weeklyRewardsSplittingGetter.currentClaimProgress(parent.address, parent.userAddress),
        );
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => UserEntryFeesCollectorModel)
    async userFeesCollector(
        @User() user: any,
        @Args('weekFilter', { nullable: true }, FeesCollectorWeekValidation) weekFilter: WeekFilterPeriodModel,
    ): Promise<UserEntryFeesCollectorModel> {
        return await this.genericQuery(() =>
            this.feesCollectorService.userFeesCollector(scAddress.feesCollector, user.publicKey, weekFilter),
        );
    }
}
