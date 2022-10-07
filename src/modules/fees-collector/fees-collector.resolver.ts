import { Args, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { FeesCollectorModel, UserEntryFeesCollectorModel } from "./models/fees-collector.model";
import { ApolloError } from "apollo-server-express";
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

@Resolver(() => FeesCollectorModel)
export class FeesCollectorResolver {
    constructor(
        private readonly feesCollectorService: FeesCollectorService,
        private readonly weeklyTimekeepingService: WeeklyTimekeepingService,
        private readonly weeklyRewardsSplittingService: WeeklyRewardsSplittingService,
    ) {}


    @ResolveField()
    async time(@Parent() parent: FeesCollectorModel): Promise<WeeklyTimekeepingModel> {
        try {
            return this.weeklyTimekeepingService.getWeeklyTimekeeping(parent.address, parent.week);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async splitRewards(@Parent() parent: FeesCollectorModel): Promise<WeeklyRewardsSplittingModel> {
        try {
            return this.weeklyRewardsSplittingService.getWeeklyRewardsSplit(parent.address, parent.week);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @Query(() => FeesCollectorModel)
    async feesCollector(
        @Args('scAddress') scAddress: string,
        @Args('week') week: number,
    ): Promise<FeesCollectorModel> {
        try {
            return this.feesCollectorService.feesCollector(scAddress, week);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @ResolveField()
    async userSplitRewards(
        @Parent() parent: UserEntryFeesCollectorModel
    ): Promise<UserWeeklyRewardsSplittingModel> {
        try {
            return this.weeklyRewardsSplittingService.getUserWeeklyRewardsSplit(parent.address, parent.userAddress, parent.week);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => UserEntryFeesCollectorModel)
    async userFeesCollector(
        @User() user: any,
        @Args('scAddress') scAddress: string,
        @Args('week') week: number,
    ): Promise<UserEntryFeesCollectorModel> {
        try {
            return this.feesCollectorService.userFeesCollector(scAddress, user.publicKey, week);
        } catch (error) {
            throw new ApolloError(error);
        }
    }
}
