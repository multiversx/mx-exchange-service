import { IWeekTimekeepingComputeService } from '../interfaces';
import { ErrorNotImplemented } from '../../../utils/errors.constants';

export class WeekTimekeepingComputeHandlers
    implements IWeekTimekeepingComputeService
{
    computeWeekForEpoch: (epoch: number) => Promise<number>;
    computeStartEpochForWeek: (week: number) => Promise<number>;
    computeEndEpochForWeek: (week: number) => Promise<number>;
    constructor(init: Partial<WeekTimekeepingComputeHandlers>) {
        Object.assign(this, init);
    }
}

export class WeekTimekeepingComputeServiceMock
    implements IWeekTimekeepingComputeService
{
    handlers: WeekTimekeepingComputeHandlers;
    computeEndEpochForWeek(week: number): Promise<number> {
        if (this.handlers.computeWeekForEpoch !== undefined) {
            return this.handlers.computeWeekForEpoch(week);
        }
        ErrorNotImplemented();
    }

    computeStartEpochForWeek(week: number): Promise<number> {
        if (this.handlers.computeStartEpochForWeek !== undefined) {
            return this.handlers.computeStartEpochForWeek(week);
        }
        ErrorNotImplemented();
    }

    computeWeekForEpoch(epoch: number): Promise<number> {
        if (this.handlers.computeEndEpochForWeek !== undefined) {
            return this.handlers.computeEndEpochForWeek(epoch);
        }
        ErrorNotImplemented();
    }

    constructor(init: Partial<WeekTimekeepingComputeHandlers>) {
        this.handlers = new WeekTimekeepingComputeHandlers(init);
    }
}
