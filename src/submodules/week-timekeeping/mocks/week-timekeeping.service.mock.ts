import { IWeekTimekeepingService } from '../interfaces';
import { ErrorNotImplemented } from '../../../utils/errors.constants';
import { WeekForEpochModel, WeekTimekeepingModel } from "../models/week-timekeeping.model";


export class WeekTimekeepingServiceMock implements IWeekTimekeepingService {
    getWeeklyTimekeepingCalled:(scAddress: string) => Promise<WeekTimekeepingModel>;
    getWeekForEpochCalled:(scAddress: string, epoch: number) => Promise<WeekForEpochModel>;

    getWeekForEpoch(scAddress: string, epoch: number): Promise<WeekForEpochModel> {
        if (this.getWeekForEpochCalled !== undefined) {
            return this.getWeekForEpochCalled(scAddress, epoch);
        }
        throw ErrorNotImplemented
    }

    getWeeklyTimekeeping(scAddress: string): Promise<WeekTimekeepingModel> {
        if (this.getWeeklyTimekeepingCalled !== undefined) {
            return this.getWeeklyTimekeepingCalled(scAddress);
        }
        throw ErrorNotImplemented
    }
    constructor(init?: Partial<WeekTimekeepingServiceMock>) {
        Object.assign(this, init);
    }
}
