import { Parent, Query, ResolveField, Resolver } from "@nestjs/graphql";
import {
    UserWeeklyRewardsSplittingModel,
    WeeklyRewardsSplittingModel,
} from "./models/weekly-rewards-splitting.model";
import { WeeklyRewardsSplittingGetterService } from "./services/weekly-rewards.splitting.getter.service";
import { WeeklyRewardsSplittingService } from "./services/weekly-rewards-splitting.service";
import { GenericResolver } from "../../services/generics/generic.resolver";
import { ApolloError } from "apollo-server-express";


@Resolver(() => WeeklyRewardsSplittingModel)
export class WeeklyRewardsSplittingResolver extends GenericResolver {
    constructor(
        protected readonly weeklyRewardsSplittingGetterService: WeeklyRewardsSplittingGetterService,
        protected readonly weeklyRewardsSplittingService: WeeklyRewardsSplittingService,
    ) {
        super();
    }

    @ResolveField()
    async totalRewardsForWeek(
        @Parent() parent: WeeklyRewardsSplittingModel
    ): Promise<string> {
        return await this.genericFieldResover(() =>
            this.weeklyRewardsSplittingService.getTotalRewardsForWeekByToken(parent.scAddress, parent.week, parent.token, parent.type),
        );
    }

    @ResolveField()
    async totalEnergyForWeek(
        @Parent() parent: any,
    ): Promise<string> {
        return await this.genericFieldResover(() =>
            this.weeklyRewardsSplittingGetterService.totalEnergyForWeek(parent.scAddress, parent.week, parent.type),
        );
    }

    @ResolveField()
    async totalLockedTokensForWeek(
        @Parent() parent: WeeklyRewardsSplittingModel
    ): Promise<string> {
        return await this.genericFieldResover(() =>
            this.weeklyRewardsSplittingGetterService.totalLockedTokensForWeek(parent.scAddress, parent.week, parent.type),
        );
    }

    @ResolveField()
    async lastGlobalUpdateWeek(
        @Parent() parent: WeeklyRewardsSplittingModel
    ): Promise<number> {
        return await this.genericFieldResover(() =>
            this.weeklyRewardsSplittingGetterService.lastGlobalUpdateWeek(parent.scAddress, parent.type),
        );
    }

    @Query(() => WeeklyRewardsSplittingModel)
    async weeklyRewardsSplit(
        @Parent() parent: any,
        type: string
    ): Promise<WeeklyRewardsSplittingModel> {
        try {
            return this.weeklyRewardsSplittingService.getWeeklyRewardsSplit(parent.address, parent.week, type);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @Query(() => UserWeeklyRewardsSplittingModel)
    async userWeeklyRewardsSplit(
        @Parent() parent: any,
        type: string
    ): Promise<UserWeeklyRewardsSplittingModel> {
        try {
            return await this.weeklyRewardsSplittingService.getUserWeeklyRewardsSplit(parent.address, parent.userAddress, parent.week, type);
        } catch (error) {
            throw new ApolloError(error);
        }
    }
}
