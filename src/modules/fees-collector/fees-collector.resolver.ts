import { Args, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { FeesCollectorModel, UserEntryFeesCollectorModel } from "./models/fees-collector.model";
import { FeesCollectorService } from "./services/fees-collector.service";
import { WeeklyTimekeepingModel } from "../../submodules/week-timekeeping/models/weekly-timekeeping.model";
import { WeeklyTimekeepingService } from "../../submodules/week-timekeeping/services/weekly-timekeeping.service";
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
        private readonly weeklyTimekeepingService: WeeklyTimekeepingService,
        private readonly weeklyRewardsSplittingService: WeeklyRewardsSplittingService,
    ) {
        super();
    }


    @ResolveField()
    async time(@Parent() parent: FeesCollectorModel): Promise<WeeklyTimekeepingModel> {
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

    @ResolveField()
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
