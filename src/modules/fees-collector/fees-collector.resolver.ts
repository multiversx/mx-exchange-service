import { Args, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { FeesCollectorModel, UserEntryFeesCollectorModel } from "./models/fees-collector.model";
import { FeesCollectorService } from "./services/fees-collector.service";
import { WeekTimekeepingModel } from "../../submodules/week-timekeeping/models/week-timekeeping.model";
import { WeekTimekeepingService } from "../../submodules/week-timekeeping/services/week-timekeeping.service";
import {
    UserWeeklyRewardsSplittingModel,
    WeeklyRewardsSplittingModel
} from "../../submodules/weekly-rewards-splitting/models/weekly-rewards-splitting.model";
import {
    WeeklyRewardsSplittingService
} from "../../submodules/weekly-rewards-splitting/services/weekly-rewards-splitting.service";
import { User } from "../../helpers/userDecorator";
import { UseGuards } from "@nestjs/common";
import { GqlAuthGuard } from "../auth/gql.auth.guard";
import { GenericResolver } from "../../services/generics/generic.resolver";

@Resolver(() => FeesCollectorModel)
export class FeesCollectorResolver extends GenericResolver{
    constructor(
        private readonly feesCollectorService: FeesCollectorService,
        private readonly weeklyTimekeepingService: WeekTimekeepingService,
        private readonly weeklyRewardsSplittingService: WeeklyRewardsSplittingService,
    ) {
        super();
    }


    @ResolveField()
    async time(@Parent() parent: FeesCollectorModel): Promise<WeekTimekeepingModel> {
        return await this.genericQuery(() =>
            this.weeklyTimekeepingService.getWeeklyTimekeeping(parent.address, parent.week),
        );
    }

    @ResolveField()
    async splitRewards(@Parent() parent: FeesCollectorModel): Promise<WeeklyRewardsSplittingModel> {
        return await this.genericQuery(() =>
            this.weeklyRewardsSplittingService.getWeeklyRewardsSplit(parent.address, parent.week),
        );
    }

    @Query(() => FeesCollectorModel)
    async feesCollector(
        @Args('scAddress') scAddress: string,
        @Args('week') week: number,
    ): Promise<FeesCollectorModel> {
        return await this.genericQuery(() =>
            this.feesCollectorService.feesCollector(scAddress, week),
        );
    }

    @ResolveField(() => UserWeeklyRewardsSplittingModel)
    async userSplitRewards(
        @Parent() parent: UserEntryFeesCollectorModel
    ): Promise<UserWeeklyRewardsSplittingModel> {
        return await this.genericQuery(() =>
            this.weeklyRewardsSplittingService.getUserWeeklyRewardsSplit(parent.address, parent.userAddress, parent.week),
        );
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => UserEntryFeesCollectorModel)
    async userFeesCollector(
        @User() user: any,
        @Args('scAddress') scAddress: string,
        @Args('week') week: number,
    ): Promise<UserEntryFeesCollectorModel> {
        return await this.genericQuery(() =>
            this.feesCollectorService.userFeesCollector(scAddress, user.publicKey, week),
        );
    }
}
