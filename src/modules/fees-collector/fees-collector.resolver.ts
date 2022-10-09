import { Args, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { FeesCollectorModel, UserEntryFeesCollectorModel } from "./models/fees-collector.model";
import { FeesCollectorService } from "./services/fees-collector.service";
import { WeekTimekeepingModel } from "../../submodules/week-timekeeping/models/week-timekeeping.model";
import {
    UserWeeklyRewardsSplittingModel,
    WeeklyRewardsSplittingModel
} from "../../submodules/weekly-rewards-splitting/models/weekly-rewards-splitting.model";
import { User } from "../../helpers/userDecorator";
import { UseGuards } from "@nestjs/common";
import { GqlAuthGuard } from "../auth/gql.auth.guard";
import { GenericResolver } from "../../services/generics/generic.resolver";
import { FeesCollectorGetterService } from "./services/fees-collector.getter.service";
import { FeesCollectorAbiService } from "./services/fees-collector.abi.service";
import {
    WeeklyRewardsSplittingResolver
} from "../../submodules/weekly-rewards-splitting/weekly-rewards-splitting.resolver";
import { WeekTimekeepingResolver } from "../../submodules/week-timekeeping/week-timekeeping.resolver";

@Resolver(() => FeesCollectorModel)
export class FeesCollectorResolver extends GenericResolver {
    constructor(
        private readonly feesCollectorService: FeesCollectorService,
        private readonly feesCollectorGetterService: FeesCollectorGetterService,
        private readonly weeklyRewardsSplittingResolver: WeeklyRewardsSplittingResolver,
        private readonly weekTimekeepingResolver: WeekTimekeepingResolver,
    ) {
        super();
    }

    @ResolveField()
    async time(
        @Parent() parent: FeesCollectorModel
    ): Promise<WeekTimekeepingModel> {
        return await this.genericQuery(() =>
            this.weekTimekeepingResolver.weekTimeKeeping(parent, FeesCollectorAbiService.name),
        );
    }

    @ResolveField()
    async splitRewards(
        @Parent() parent: FeesCollectorModel
    ): Promise<WeeklyRewardsSplittingModel> {
        return await this.genericQuery(() =>
            this.weeklyRewardsSplittingResolver.weeklyRewardsSplit(parent, FeesCollectorAbiService.name),
        );
    }

    @ResolveField()
    async accumulatedFees(
        @Parent() parent: FeesCollectorModel
    ): Promise<number> {
        return await this.genericQuery(() =>
            this.feesCollectorGetterService.getAccumulatedFees(parent.address, parent.week, parent.token),
        );
    }

    @Query(() => FeesCollectorModel)
    async feesCollector(
        @Args('scAddress') scAddress: string,
        @Args('week') week: number,
        @Args('token') token: string,
    ): Promise<FeesCollectorModel> {
        return await this.genericQuery(() =>
            this.feesCollectorService.feesCollector(scAddress, week, token),
        );
    }

    @ResolveField(() => UserWeeklyRewardsSplittingModel)
    async userSplitRewards(
        @Parent() parent: UserEntryFeesCollectorModel
    ): Promise<UserWeeklyRewardsSplittingModel> {
        return await this.genericQuery(() =>
            this.weeklyRewardsSplittingResolver.userWeeklyRewardsSplit(parent, FeesCollectorAbiService.name),
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
