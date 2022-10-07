import { Args, Parent, Query, ResolveField, Resolver } from "@nestjs/graphql";
import {
    UserWeeklyRewardsSplittingModel,
    WeeklyRewardsSplittingModel,
} from "./models/weekly-rewards-splitting.model";
import { UseGuards } from "@nestjs/common";
import { WeeklyRewardsSplittingGetterService } from "./services/weekly-rewards.splitting.getter.service";
import { NftCollection } from "../../modules/tokens/models/nftCollection.model";
import { ApolloError } from "apollo-server-express";
import { WeeklyRewardsSplittingService } from "./services/weekly-rewards-splitting.service";
import { GqlAuthGuard } from "../../modules/auth/gql.auth.guard";
import { User } from "../../helpers/userDecorator";
import { genericFieldResover } from "../../utils/resolver";


@Resolver(() => WeeklyRewardsSplittingModel)
export class WeeklyRewardsSplittingResolver {
    constructor(
        protected readonly weeklyRewardsSplittingGetterService: WeeklyRewardsSplittingGetterService,
        protected readonly weeklyRewardsSplittingService: WeeklyRewardsSplittingService,
    ) {}

    @ResolveField()
    async totalRewards(
        @Parent() parent: WeeklyRewardsSplittingModel
    ): Promise<NftCollection> {
        return await genericFieldResover(() =>
            this.weeklyRewardsSplittingGetterService.totalRewardsForWeek(parent.scAddress, parent.week),
        );
    }

    @ResolveField()
    async totalEnergy(
        @Parent() parent: WeeklyRewardsSplittingModel
    ): Promise<NftCollection> {
        return await genericFieldResover(() =>
            this.weeklyRewardsSplittingGetterService.totalEnergyForWeek(parent.scAddress, parent.week),
        );
    }

    @ResolveField()
    async totalLockedTokens(
        @Parent() parent: WeeklyRewardsSplittingModel
    ): Promise<NftCollection> {
        return await genericFieldResover(() =>
            this.weeklyRewardsSplittingGetterService.totalLockedTokensForWeek(parent.scAddress, parent.week),
        );
    }

    @ResolveField()
    async lastGlobalUpdateWeek(
        @Parent() parent: WeeklyRewardsSplittingModel
    ): Promise<NftCollection> {
        return await genericFieldResover(() =>
            this.weeklyRewardsSplittingGetterService.lastGlobalUpdateWeek(parent.scAddress),
        );
    }

    @Query(() => WeeklyRewardsSplittingModel)
    async weeklyRewardsSplitByWeek(
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
    async weeklyRewardsSplit(
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
