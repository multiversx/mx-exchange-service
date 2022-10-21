import { IWeekTimekeepingComputeService } from '../interfaces';
import { ErrorNotImplemented } from '../../../utils/errors.constants';


export class WeekTimekeepingComputeHandlers implements IWeekTimekeepingComputeService {
    computeWeekForEpoch:(scAddress: string, epoch: number) => Promise<number>;
    computeStartEpochForWeek:(scAddress: string, week: number) => Promise<number>;
    computeEndEpochForWeek:(scAddress: string, week: number) => Promise<number>;
    constructor(init: Partial<WeekTimekeepingComputeHandlers>) {
        Object.assign(this, init);
    }
}

export class WeekTimekeepingComputeServiceMock implements IWeekTimekeepingComputeService {
    handlers: WeekTimekeepingComputeHandlers;
    computeEndEpochForWeek(scAddress: string, week: number): Promise<number> {
        if (this.handlers.computeWeekForEpoch !== undefined) {
            return this.handlers.computeWeekForEpoch(scAddress, week);
        }
        throw ErrorNotImplemented
    }

    computeStartEpochForWeek(scAddress: string, week: number): Promise<number> {
        if (this.handlers.computeStartEpochForWeek !== undefined) {
            return this.handlers.computeStartEpochForWeek(scAddress, week);
        }
        throw ErrorNotImplemented
    }

    computeWeekForEpoch(scAddress: string, epoch: number): Promise<number> {
        if (this.handlers.computeEndEpochForWeek !== undefined) {
            return this.handlers.computeEndEpochForWeek(scAddress, epoch);
        }
        throw ErrorNotImplemented
    }

    constructor(init: Partial<WeekTimekeepingComputeHandlers>) {
        this.handlers = new WeekTimekeepingComputeHandlers(init);
    }
}
