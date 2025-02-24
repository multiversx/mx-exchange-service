import { Args, Query, ResolveField, Resolver } from '@nestjs/graphql';
import {
    WeekForEpochModel,
    WeekTimekeepingModel,
} from './models/week-timekeeping.model';
import { WeekTimekeepingAbiService } from './services/week-timekeeping.abi.service';
import { WeekTimekeepingComputeService } from './services/week-timekeeping.compute.service';

@Resolver(() => WeekTimekeepingModel)
export class WeekTimekeepingResolver {
    constructor(
        private readonly weekTimekeepingAbi: WeekTimekeepingAbiService,
        private readonly weekTimekeepingCompute: WeekTimekeepingComputeService,
    ) {}

    @ResolveField()
    async firstWeekStartEpoch(parent: WeekTimekeepingModel): Promise<number> {
        return this.weekTimekeepingAbi.firstWeekStartEpoch(parent.scAddress);
    }

    @ResolveField()
    async currentWeek(parent: WeekTimekeepingModel): Promise<number> {
        return this.weekTimekeepingAbi.currentWeek(parent.scAddress);
    }

    @ResolveField()
    async startEpochForWeek(parent: WeekTimekeepingModel): Promise<number> {
        return this.weekTimekeepingCompute.startEpochForWeek(
            parent.scAddress,
            parent.currentWeek,
        );
    }

    @ResolveField()
    async endEpochForWeek(parent: WeekTimekeepingModel): Promise<number> {
        return this.weekTimekeepingCompute.endEpochForWeek(
            parent.scAddress,
            parent.currentWeek,
        );
    }

    @Query(() => WeekTimekeepingModel)
    async weeklyTimekeeping(
        @Args('scAddress') scAddress: string,
    ): Promise<WeekTimekeepingModel> {
        const currentWeek = await this.weekTimekeepingAbi.currentWeek(
            scAddress,
        );
        return new WeekTimekeepingModel({
            scAddress: scAddress,
            currentWeek: currentWeek,
        });
    }

    @Query(() => WeekForEpochModel)
    async weekForEpoch(
        @Args('scAddress') scAddress: string,
        @Args('epoch') epoch: number,
    ): Promise<WeekForEpochModel> {
        return new WeekForEpochModel({
            scAddress: scAddress,
            epoch: epoch,
        });
    }
}
