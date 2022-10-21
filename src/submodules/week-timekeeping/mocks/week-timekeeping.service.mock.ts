import { IWeekTimekeepingService } from '../interfaces';
import { ErrorNotImplemented } from '../../../utils/errors.constants';
import { WeekForEpochModel, WeekTimekeepingModel } from "../models/week-timekeeping.model";

export class WeekTimekeepingHandlers implements IWeekTimekeepingService {
    getWeeklyTimekeeping:(scAddress: string) => Promise<WeekTimekeepingModel>;
    getWeekForEpoch:(scAddress: string, epoch: number) => Promise<WeekForEpochModel>;
    constructor(init?: Partial<WeekTimekeepingHandlers>) {
        Object.assign(this, init);
    }
}

export class WeekTimekeepingServiceMock implements IWeekTimekeepingService {
    handlers: WeekTimekeepingHandlers;
    getWeekForEpoch(scAddress: string, epoch: number): Promise<WeekForEpochModel> {
        if (this.handlers.getWeekForEpoch !== undefined) {
            return this.handlers.getWeekForEpoch(scAddress, epoch);
        }
        throw ErrorNotImplemented
    }

    getWeeklyTimekeeping(scAddress: string): Promise<WeekTimekeepingModel> {
        if (this.handlers.getWeeklyTimekeeping !== undefined) {
            return this.handlers.getWeeklyTimekeeping(scAddress);
        }
        throw ErrorNotImplemented
    }

    constructor(init: Partial<WeekTimekeepingHandlers>) {
        this.handlers = new WeekTimekeepingHandlers(init)
    }
}
