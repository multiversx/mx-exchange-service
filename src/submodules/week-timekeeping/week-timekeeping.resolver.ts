import { Args, Parent, Query, ResolveField, Resolver } from "@nestjs/graphql";
import { WeekForEpochModel, WeekTimekeepingModel } from "./models/week-timekeeping.model";
import { WeekTimekeepingService } from "./services/week-timekeeping.service";
import { WeekTimekeepingGetterService } from "./services/week-timekeeping.getter.service";
import { WeekTimekeepingComputeService } from "./services/week-timekeeping.compute.service";
import { GenericResolver } from "../../services/generics/generic.resolver";


@Resolver(() => WeekTimekeepingModel)
export class WeekTimekeepingResolver extends GenericResolver{
    constructor(
        protected readonly weekTimekeepingGetter: WeekTimekeepingGetterService,
        protected readonly weekTimekeepingCompute: WeekTimekeepingComputeService,
        protected readonly weekTimekeepingService: WeekTimekeepingService,
    ) {
        super();
    }

    @ResolveField()
    async firstWeekStartEpoch(
        @Parent() parent: WeekTimekeepingModel
    ): Promise<number> {
        return await this.genericFieldResover(() =>
            this.weekTimekeepingGetter.getFirstWeekStartEpoch(parent.scAddress),
        );
    }

    @ResolveField()
    async currentWeek(
        @Parent() parent: WeekTimekeepingModel
    ): Promise<number> {
        return await this.genericFieldResover(() =>
            this.weekTimekeepingGetter.getCurrentWeek(parent.scAddress),
        );
    }

    @ResolveField()
    async startEpochForWeek(
        @Parent() parent: WeekTimekeepingModel
    ): Promise<number> {
        return await this.genericFieldResover(() =>
            this.weekTimekeepingGetter.getStartEpochForWeek(parent.scAddress, parent.currentWeek),
        );
    }

    @ResolveField()
    async endEpochForWeek(
        @Parent() parent: WeekTimekeepingModel
    ): Promise<number> {
        return await this.genericFieldResover(() =>
            this.weekTimekeepingGetter.getEndEpochForWeek(parent.scAddress, parent.currentWeek),
        );
    }

    @Query(() => WeekTimekeepingModel)
    async weeklyTimekeeping(
        @Args('scAddress') scAddress: string,
    ): Promise<WeekTimekeepingModel> {
        return await this.genericFieldResover(() =>
            this.weekTimekeepingService.getWeeklyTimekeeping(scAddress),
        );
    }

    @ResolveField(() => WeekForEpochModel)
    async week(
        @Parent() parent: WeekForEpochModel
    ): Promise<number> {
        return await this.genericFieldResover(() =>
            this.weekTimekeepingCompute.computeWeekForEpoch(parent.scAddress, parent.epoch),
        );
    }

    @Query(() => WeekForEpochModel)
    async weekForEpoch(
        @Args('scAddress') scAddress: string,
        @Args('epoch') epoch: number,
    ): Promise<WeekForEpochModel> {
        return await this.genericFieldResover(() =>
            this.weekTimekeepingService.getWeekForEpoch(scAddress, epoch),
        );
    }
}
