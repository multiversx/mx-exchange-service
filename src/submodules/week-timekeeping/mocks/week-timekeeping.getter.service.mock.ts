import { IWeekTimekeepingGetterService } from '../interfaces';
import { ErrorNotImplemented } from '../../../utils/errors.constants';


export class WeekTimekeepingGetterHandlers implements IWeekTimekeepingGetterService{
    getCurrentWeek:(scAddress: string) => Promise<number>;
    getFirstWeekStartEpoch:(scAddress: string) => Promise<number>;
    getStartEpochForWeek:(scAddress: string, week: number) => Promise<number>;
    getEndEpochForWeek:(scAddress: string, week: number) => Promise<number>;
    constructor(init: Partial<WeekTimekeepingGetterHandlers>) {
        Object.assign(this, init);
    }
}

export class WeekTimekeepingGetterServiceMock implements IWeekTimekeepingGetterService {
    handlers: WeekTimekeepingGetterHandlers;
    getCurrentWeek(scAddress: string): Promise<number> {
        if (this.handlers.getCurrentWeek !== undefined) {
            return this.handlers.getCurrentWeek(scAddress);
        }
        throw ErrorNotImplemented
    }

    getEndEpochForWeek(scAddress: string, week: number): Promise<number> {
        if (this.handlers.getEndEpochForWeek !== undefined) {
            return this.handlers.getEndEpochForWeek(scAddress, week);
        }
        throw ErrorNotImplemented
    }

    getFirstWeekStartEpoch(scAddress: string): Promise<number> {
        if (this.handlers.getFirstWeekStartEpoch !== undefined) {
            return this.handlers.getFirstWeekStartEpoch(scAddress);
        }
        throw ErrorNotImplemented
    }

    getStartEpochForWeek(scAddress: string, week: number): Promise<number> {
        if (this.handlers.getStartEpochForWeek !== undefined) {
            return this.handlers.getStartEpochForWeek(scAddress, week);
        }
        throw ErrorNotImplemented
    }

    constructor(init: Partial<WeekTimekeepingGetterHandlers>) {
        this.handlers = new WeekTimekeepingGetterHandlers(init);
    }
}