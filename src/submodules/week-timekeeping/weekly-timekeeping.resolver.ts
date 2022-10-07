import { Args, Parent, Query, ResolveField, Resolver } from "@nestjs/graphql";
import {
    WeeklyRewardsSplittingModel
} from "../weekly-rewards-splitting/models/weekly-rewards-splitting.model";

import { WeekForEpochModel, WeeklyTimekeepingModel } from "./models/weekly-timekeeping.model";
import { WeeklyTimekeepingService } from "./services/weekly-timekeeping.service";
import { WeekTimekeepingGetterService } from "./services/week-timekeeping.getter.service";
import { WeekTimekeepingComputeService } from "./services/week-timekeeping.compute.service";
import { GenericResolver } from "../../services/generics/generic.resolver";


@Resolver(() => WeeklyRewardsSplittingModel)
export class WeeklyTimekeepingResolver extends GenericResolver{
    constructor(
        protected readonly weekTimekeepingGetterService: WeekTimekeepingGetterService,
        protected readonly computerService: WeekTimekeepingComputeService,
        protected readonly weeklyTimekeepingService: WeeklyTimekeepingService,
    ) {
        super();
    }

    @ResolveField()
    async firstWeekStartEpoch(
        @Parent() parent: WeeklyRewardsSplittingModel
    ): Promise<number> {
        return await this.genericFieldResover(() =>
            this.weekTimekeepingGetterService.getFirstWeekStartEpoch(parent.scAddress),
        );
    }

    @ResolveField()
    async currentWeek(
        @Parent() parent: WeeklyRewardsSplittingModel
    ): Promise<number> {
        return await this.genericFieldResover(() =>
            this.weekTimekeepingGetterService.getCurrentWeek(parent.scAddress),
        );
    }

    @ResolveField()
    async startEpochForWeek(
        @Parent() parent: WeeklyRewardsSplittingModel
    ): Promise<number> {
        return await this.genericFieldResover(() =>
            this.weekTimekeepingGetterService.getStartEpochForWeek(parent.scAddress, parent.week),
        );
    }

    @ResolveField()
    async endEpochForWeek(
        @Parent() parent: WeeklyRewardsSplittingModel
    ): Promise<number> {
        return await this.genericFieldResover(() =>
            this.weekTimekeepingGetterService.getEndEpochForWeek(parent.scAddress, parent.week),
        );
    }

    @Query(() => WeeklyTimekeepingModel)
    async weeklyTimekeeping(
        @Args('scAddress') scAddress: string,
        @Args('week') week: number,
    ): Promise<WeeklyTimekeepingModel> {
        return await this.genericFieldResover(() =>
            this.weeklyTimekeepingService.getWeeklyTimekeeping(scAddress, week),
        );
    }

    @ResolveField()
    async week(
        @Parent() parent: WeekForEpochModel
    ): Promise<number> {
        return await this.genericFieldResover(() =>
            this.computerService.computeWeekForEpoch(parent.scAddress, parent.epoch),
        );
    }

    @Query(() => WeekForEpochModel)
    async weekForEpoch(
        @Args('scAddress') scAddress: string,
        @Args('epoch') epoch: number,
    ): Promise<WeekForEpochModel> {
        return await this.genericFieldResover(() =>
            this.weeklyTimekeepingService.getWeekForEpoch(scAddress, epoch),
        );
    }
}
