import { Args, Parent, Query, ResolveField, Resolver } from "@nestjs/graphql";
import {
    UserWeeklyRewardsSplittingModel,
    WeeklyRewardsSplittingModel,
} from "./models/weekly-rewards-splitting.model";
import { UseGuards } from "@nestjs/common";
import { WeeklyRewardsSplittingGetterService } from "./services/weekly-rewards.splitting.getter.service";
import { ApolloError } from "apollo-server-express";
import { WeeklyRewardsSplittingService } from "./services/weekly-rewards-splitting.service";
import { GqlAuthGuard } from "../../modules/auth/gql.auth.guard";
import { User } from "../../helpers/userDecorator";
import { GenericResolver } from "../../services/generics/generic.resolver";


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
            this.weeklyRewardsSplittingGetterService.totalRewardsForWeek(parent.scAddress, parent.week),
        );
    }

    @ResolveField()
    async totalEnergyForWeek(
        @Parent() parent: WeeklyRewardsSplittingModel
    ): Promise<string> {
        return await this.genericFieldResover(() =>
            this.weeklyRewardsSplittingGetterService.totalEnergyForWeek(parent.scAddress, parent.week),
        );
    }

    @ResolveField()
    async totalLockedTokensForWeek(
        @Parent() parent: WeeklyRewardsSplittingModel
    ): Promise<string> {
        return await this.genericFieldResover(() =>
            this.weeklyRewardsSplittingGetterService.totalLockedTokensForWeek(parent.scAddress, parent.week),
        );
    }

    @ResolveField()
    async lastGlobalUpdateWeek(
        @Parent() parent: WeeklyRewardsSplittingModel
    ): Promise<number> {
        return await this.genericFieldResover(() =>
            this.weeklyRewardsSplittingGetterService.lastGlobalUpdateWeek(parent.scAddress),
        );
    }

    @Query(() => WeeklyRewardsSplittingModel)
    async weeklyRewardsSplit(
        @Args('scAddress') scAddress: string,
        @Args('week') week: number,
    ): Promise<WeeklyRewardsSplittingModel> {
        try {
            return this.weeklyRewardsSplittingService.getWeeklyRewardsSplit(scAddress, week);
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => UserWeeklyRewardsSplittingModel)
    async userWeeklyRewardsSplit(
        @User() user: any,
        @Args('scAddress') scAddress: string,
        @Args('week') week: number,
    ): Promise<UserWeeklyRewardsSplittingModel> {
        try {
            return await this.weeklyRewardsSplittingService.getUserWeeklyRewardsSplit(scAddress, user.publicKey, week);
        } catch (error) {
            throw new ApolloError(error);
        }
    }
}
