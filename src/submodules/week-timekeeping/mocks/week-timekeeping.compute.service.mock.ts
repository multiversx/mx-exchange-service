import { IWeekTimekeepingComputeService } from '../interfaces';
import { ErrorNotImplemented } from '../../../utils/errors.constants';


export class WeekTimekeepingComputeServiceMock implements IWeekTimekeepingComputeService {
    computeWeekForEpochCalled:(scAddress: string, epoch: number) => Promise<number>;
    computeStartEpochForWeekCalled:(scAddress: string, week: number) => Promise<number>;
    computeEndEpochForWeekCalled:(scAddress: string, week: number) => Promise<number>;


    computeEndEpochForWeek(scAddress: string, week: number): Promise<number> {
        if (this.computeWeekForEpochCalled !== undefined) {
            return this.computeWeekForEpochCalled(scAddress, week);
        }
        throw ErrorNotImplemented
    }

    computeStartEpochForWeek(scAddress: string, week: number): Promise<number> {
        if (this.computeStartEpochForWeekCalled !== undefined) {
            return this.computeStartEpochForWeekCalled(scAddress, week);
        }
        throw ErrorNotImplemented
    }

    computeWeekForEpoch(scAddress: string, epoch: number): Promise<number> {
        if (this.computeEndEpochForWeekCalled !== undefined) {
            return this.computeEndEpochForWeekCalled(scAddress, epoch);
        }
        throw ErrorNotImplemented
    }

    constructor(init?: Partial<WeekTimekeepingComputeServiceMock>) {
        Object.assign(this, init);
    }

}