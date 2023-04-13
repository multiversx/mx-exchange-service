import { Args, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import {
    WeekForEpochModel,
    WeekTimekeepingModel,
} from './models/week-timekeeping.model';
import { GenericResolver } from '../../services/generics/generic.resolver';
import { WeekTimekeepingAbiService } from './services/week-timekeeping.abi.service';
import { WeekTimekeepingComputeService } from './services/week-timekeeping.compute.service';

@Resolver(() => WeekTimekeepingModel)
export class WeekTimekeepingResolver extends GenericResolver {
    constructor(
        private readonly weekTimekeepingAbi: WeekTimekeepingAbiService,
        private readonly weekTimekeepingCompute: WeekTimekeepingComputeService,
    ) {
        super();
    }

    @ResolveField()
    async firstWeekStartEpoch(
        @Parent() parent: WeekTimekeepingModel,
    ): Promise<number> {
        return await this.genericFieldResolver(() =>
            this.weekTimekeepingAbi.firstWeekStartEpoch(parent.scAddress),
        );
    }

    @ResolveField()
    async currentWeek(@Parent() parent: WeekTimekeepingModel): Promise<number> {
        return await this.genericFieldResolver(() =>
            this.weekTimekeepingAbi.currentWeek(parent.scAddress),
        );
    }

    @ResolveField()
    async startEpochForWeek(
        @Parent() parent: WeekTimekeepingModel,
    ): Promise<number> {
        return await this.genericFieldResolver(() =>
            this.weekTimekeepingCompute.startEpochForWeek(
                parent.scAddress,
                parent.currentWeek,
            ),
        );
    }

    @ResolveField()
    async endEpochForWeek(
        @Parent() parent: WeekTimekeepingModel,
    ): Promise<number> {
        return await this.genericFieldResolver(() =>
            this.weekTimekeepingCompute.endEpochForWeek(
                parent.scAddress,
                parent.currentWeek,
            ),
        );
    }

    @Query(() => WeekTimekeepingModel)
    async weeklyTimekeeping(
        @Args('scAddress') scAddress: string,
    ): Promise<WeekTimekeepingModel> {
        return await this.genericQuery(async () => {
            const currentWeek = await this.weekTimekeepingAbi.currentWeek(
                scAddress,
            );
            return new WeekTimekeepingModel({
                scAddress: scAddress,
                currentWeek: currentWeek,
            });
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
