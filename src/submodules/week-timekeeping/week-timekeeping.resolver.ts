import { Args, Query, Resolver } from '@nestjs/graphql';
import { StateService } from 'src/modules/dex-state/services/state.service';
import { WeekTimekeepingModel } from './models/week-timekeeping.model';

@Resolver(() => WeekTimekeepingModel)
export class WeekTimekeepingResolver {
    constructor(private readonly stateService: StateService) {}

    @Query(() => WeekTimekeepingModel)
    async weeklyTimekeeping(
        @Args('scAddress') scAddress: string,
    ): Promise<WeekTimekeepingModel> {
        return this.stateService.getWeeklyTimekeeping(scAddress);
    }
}
