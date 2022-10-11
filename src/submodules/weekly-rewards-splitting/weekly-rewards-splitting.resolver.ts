import { Args, Parent, Query, ResolveField, Resolver } from "@nestjs/graphql";
import {
    UserWeeklyRewardsSplittingModel,
    WeeklyRewardsSplittingModel,
} from "./models/weekly-rewards-splitting.model";
import { UseGuards } from "@nestjs/common";
import { WeeklyRewardsSplittingGetterService } from "./services/weekly-rewards.splitting.getter.service";
import { WeeklyRewardsSplittingService } from "./services/weekly-rewards-splitting.service";
import { GqlAuthGuard } from "../../modules/auth/gql.auth.guard";
import { User } from "../../helpers/userDecorator";
import { GenericResolver } from "../../services/generics/generic.resolver";


@Resolver(() => WeeklyRewardsSplittingModel)
export class WeeklyRewardsSplittingResolver extends GenericResolver {
    constructor(
        protected readonly weeklyRewardsSplittingGetter: WeeklyRewardsSplittingGetterService,
        protected readonly weeklyRewardsSplittingService: WeeklyRewardsSplittingService,
    ) {
        super();
    }

    @ResolveField()
    async totalRewardsForWeek(
        @Parent() parent: WeeklyRewardsSplittingModel
    ): Promise<string> {
        return await this.genericFieldResover(() =>
            this.weeklyRewardsSplittingGetter.totalRewardsForWeek(parent.scAddress, parent.week),
        );
    }

    @ResolveField()
    async totalEnergyForWeek(
        @Parent() parent: WeeklyRewardsSplittingModel
    ): Promise<string> {
        return await this.genericFieldResover(() =>
            this.weeklyRewardsSplittingGetter.totalEnergyForWeek(parent.scAddress, parent.week),
        );
    }

    @ResolveField()
    async totalLockedTokensForWeek(
        @Parent() parent: WeeklyRewardsSplittingModel
    ): Promise<string> {
        return await this.genericFieldResover(() =>
            this.weeklyRewardsSplittingGetter.totalLockedTokensForWeek(parent.scAddress, parent.week),
        );
    }

    @ResolveField()
    async lastGlobalUpdateWeek(
        @Parent() parent: WeeklyRewardsSplittingModel
    ): Promise<number> {
        return await this.genericFieldResover(() =>
            this.weeklyRewardsSplittingGetter.lastGlobalUpdateWeek(parent.scAddress),
        );
    }

    @Query(() => WeeklyRewardsSplittingModel)
    async weeklyRewardsSplit(
        @Args('scAddress') scAddress: string,
        @Args('week') week: number,
    ): Promise<WeeklyRewardsSplittingModel> {
        return await this.genericQuery(() =>
            this.weeklyRewardsSplittingService.getWeeklyRewardsSplit(scAddress, week),
        );
    }

    @UseGuards(GqlAuthGuard)
    @Query(() => UserWeeklyRewardsSplittingModel)
    async userWeeklyRewardsSplit(
        @User() user: any,
        @Args('scAddress') scAddress: string,
        @Args('week') week: number,
    ): Promise<UserWeeklyRewardsSplittingModel> {
        return await this.genericQuery(() =>
            this.weeklyRewardsSplittingService.getUserWeeklyRewardsSplit(scAddress, user.publicKey, week),
        );
    }
}
