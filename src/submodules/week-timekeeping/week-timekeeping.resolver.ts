import { Parent, Query, ResolveField, Resolver } from "@nestjs/graphql";
import { WeekForEpochModel, WeekTimekeepingModel } from "./models/week-timekeeping.model";
import { WeekTimekeepingService } from "./services/week-timekeeping.service";
import { WeekTimekeepingGetterService } from "./services/week-timekeeping.getter.service";
import { WeekTimekeepingComputeService } from "./services/week-timekeeping.compute.service";
import { GenericResolver } from "../../services/generics/generic.resolver";


@Resolver(() => WeekTimekeepingModel)
export class WeekTimekeepingResolver extends GenericResolver{
    constructor(
        protected readonly weekTimekeepingGetterService: WeekTimekeepingGetterService,
        protected readonly computerService: WeekTimekeepingComputeService,
        protected readonly weeklyTimekeepingService: WeekTimekeepingService,
    ) {
        super();
    }

    @ResolveField()
    async firstWeekStartEpoch(
        @Parent() parent: any
    ): Promise<number> {
        return await this.genericFieldResover(() =>
            this.weekTimekeepingGetterService.getFirstWeekStartEpoch(parent.scAddress, parent.type),
        );
    }

    @ResolveField()
    async currentWeek(
        @Parent() parent: any
    ): Promise<number> {
        return await this.genericFieldResover(() =>
            this.weekTimekeepingGetterService.getCurrentWeek(parent.scAddress, parent.type),
        );
    }

    @ResolveField()
    async startEpochForWeek(
        @Parent() parent: any
    ): Promise<number> {
        return await this.genericFieldResover(() =>
            this.weekTimekeepingGetterService.getStartEpochForWeek(parent.scAddress, parent.week, parent.type),
        );
    }

    @ResolveField()
    async endEpochForWeek(
        @Parent() parent: any
    ): Promise<number> {
        return await this.genericFieldResover(() =>
            this.weekTimekeepingGetterService.getEndEpochForWeek(parent.scAddress, parent.week, parent.type),
        );
    }

    @ResolveField()
    async week(
        @Parent() parent: any
    ): Promise<number> {
        return await this.genericFieldResover(() =>
            this.computerService.computeWeekForEpoch(parent.scAddress, parent.epoch, parent.type),
        );
    }

    @Query(() => WeekForEpochModel)
    async weekForEpoch(
        @Parent() parent: any
    ): Promise<WeekForEpochModel> {
        return await this.genericFieldResover(() =>
            this.weeklyTimekeepingService.getWeekForEpoch(parent.address, parent.epoch, parent.type),
        );
    }

    @Query(() => WeekTimekeepingModel)
    async weekTimeKeeping(
        @Parent() parent: any,
        type: string
    ): Promise<WeekTimekeepingModel> {
        return await this.genericFieldResover(() =>
            this.weeklyTimekeepingService.getWeeklyTimekeeping(parent.address, parent.week, type),
        );
    }
}
