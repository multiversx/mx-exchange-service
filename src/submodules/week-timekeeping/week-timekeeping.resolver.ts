import { Args, Query, Resolver } from '@nestjs/graphql';
import { StateService } from 'src/modules/state/services/state.service';
import {
    WeekForEpochModel,
    WeekTimekeepingModel,
} from './models/week-timekeeping.model';

@Resolver(() => WeekTimekeepingModel)
export class WeekTimekeepingResolver {
    constructor(private readonly stateService: StateService) {}

    @Query(() => WeekTimekeepingModel)
    async weeklyTimekeeping(
        @Args('scAddress') scAddress: string,
    ): Promise<WeekTimekeepingModel> {
        return this.stateService.getWeeklyTimekeeping(scAddress);
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
