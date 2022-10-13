import { IWeekTimekeepingGetterService } from '../interfaces';
import { ErrorNotImplemented } from '../../../utils/errors.constants';


export class WeekTimekeepingGetterServiceMock implements IWeekTimekeepingGetterService {

    constructor(init?: Partial<WeekTimekeepingGetterServiceMock>) {
        Object.assign(this, init);
    }

    getCurrentWeekCalled:(scAddress: string) => Promise<number>;
    getFirstWeekStartEpochCalled:(scAddress: string) => Promise<number>;
    getStartEpochForWeekCalled:(scAddress: string, week: number) => Promise<number>;
    getEndEpochForWeekCalled:(scAddress: string, week: number) => Promise<number>;

    getCurrentWeek(scAddress: string): Promise<number> {
        if (this.getCurrentWeekCalled !== undefined) {
            return this.getCurrentWeekCalled(scAddress);
        }
        throw ErrorNotImplemented
    }

    getEndEpochForWeek(scAddress: string, week: number): Promise<number> {
        if (this.getEndEpochForWeekCalled !== undefined) {
            return this.getEndEpochForWeekCalled(scAddress, week);
        }
        throw ErrorNotImplemented
    }

    getFirstWeekStartEpoch(scAddress: string): Promise<number> {
        if (this.getFirstWeekStartEpochCalled !== undefined) {
            return this.getFirstWeekStartEpochCalled(scAddress);
        }
        throw ErrorNotImplemented
    }

    getStartEpochForWeek(scAddress: string, week: number): Promise<number> {
        if (this.getStartEpochForWeekCalled !== undefined) {
            return this.getStartEpochForWeekCalled(scAddress, week);
        }
        throw ErrorNotImplemented
    }
}