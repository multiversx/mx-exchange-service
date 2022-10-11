import { Args, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { FeesCollectorModel, UserEntryFeesCollectorModel } from "./models/fees-collector.model";
import { FeesCollectorService } from "./services/fees-collector.service";
import {
    UserWeeklyRewardsSplittingModel,
    WeeklyRewardsSplittingModel
} from "../../submodules/weekly-rewards-splitting/models/weekly-rewards-splitting.model";
import { User } from "../../helpers/userDecorator";
import { UseGuards } from "@nestjs/common";
import { GqlAuthGuard } from "../auth/gql.auth.guard";
import { GenericResolver } from "../../services/generics/generic.resolver";
import { WeekTimekeepingResolver } from "../../submodules/week-timekeeping/week-timekeeping.resolver";
import {
    WeeklyRewardsSplittingResolver
} from "../../submodules/weekly-rewards-splitting/weekly-rewards-splitting.resolver";
import { scAddress } from "../../config";
import { EsdtTokenPayment } from "../../models/esdtTokenPayment.model";

@Resolver(() => FeesCollectorModel)
export class FeesCollectorResolver extends GenericResolver{
    constructor(
        private readonly feesCollectorService: FeesCollectorService,
        private readonly weekTimekeepingResolver: WeekTimekeepingResolver,
        private readonly weeklyRewardsSplittingResolver: WeeklyRewardsSplittingResolver,
    ) {
        super();
    }

    @ResolveField(() => [WeeklyRewardsSplittingModel])
    async splitRewards(@Parent() parent: FeesCollectorModel): Promise<WeeklyRewardsSplittingModel[]> {
        const promisesList = []
        for (let week = parent.startWeek; week <= parent.endWeek; week++) {
            promisesList.push(this.weeklyRewardsSplittingResolver.weeklyRewardsSplit(parent.address, week))
        }
        return await this.genericQuery(() =>
            Promise.all(promisesList),
        );
    }

    @ResolveField(() => [EsdtTokenPayment])
    async accumulatedFees(@Parent() parent: FeesCollectorModel): Promise<EsdtTokenPayment[]> {
        return await this.genericQuery(() =>
            this.feesCollectorService.getAccumulatedFees(parent.address, parent.time.currentWeek, parent.allTokens)
        );
    }

    @Query(() => FeesCollectorModel)
    async feesCollector(
        @Args('startWeek', { nullable: true }) startWeek: number,
        @Args('endWeek', { nullable: true }) endWeek: number,
    ): Promise<FeesCollectorModel> {
        return await this.genericQuery(() =>
            this.feesCollectorService.feesCollector(scAddress.feesCollector, startWeek, endWeek),
        );
    }

    @ResolveField(() => [UserWeeklyRewardsSplittingModel])
    async userSplitRewards(
        @Parent() parent: UserEntryFeesCollectorModel
    ): Promise<UserWeeklyRewardsSplittingModel[]> {
        const promisesList = []
        for (let week = parent.startWeek; week <= parent.endWeek; week++) {
            promisesList.push(this.weeklyRewardsSplittingResolver.userWeeklyRewardsSplit(parent.address, parent.userAddress, week))
        }
        return await this.genericQuery(() =>
            Promise.all(promisesList),
        );
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => UserEntryFeesCollectorModel)
    async userFeesCollector(
        @User() user: any,
        @Args('startWeek', { nullable: true }) startWeek: number,
        @Args('endWeek', { nullable: true }) endWeek: number,
    ): Promise<UserEntryFeesCollectorModel> {
        return await this.genericQuery(() =>
            this.feesCollectorService.userFeesCollector(scAddress.feesCollector, user.publicKey, startWeek, endWeek),
        );
    }
}
