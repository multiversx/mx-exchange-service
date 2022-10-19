import { GlobalInfoByWeekModel, UserInfoByWeekModel, } from '../models/weekly-rewards-splitting.model';
import { IWeeklyRewardsSplittingService } from "../interfaces";
import { ErrorNotImplemented } from "../../../utils/errors.constants";

export class WeeklyRewardsSplittingServiceMock implements IWeeklyRewardsSplittingService {
    getGlobalInfoByWeekCalled: (scAddress: string, week: number) => GlobalInfoByWeekModel;
    getUserInfoByWeekCalled:(scAddress: string, userAddress: string, week: number) => UserInfoByWeekModel;

    getGlobalInfoByWeek(scAddress: string, week: number): GlobalInfoByWeekModel {
        if (this.getGlobalInfoByWeekCalled !== undefined) {
            return this.getGlobalInfoByWeekCalled(scAddress, week);
        }
        throw ErrorNotImplemented
    }

    getUserInfoByWeek(scAddress: string, userAddress: string, week: number): UserInfoByWeekModel {
        if (this.getUserInfoByWeekCalled !== undefined) {
            return this.getUserInfoByWeekCalled(scAddress, userAddress, week);
        }
        throw ErrorNotImplemented
    }
    constructor(init?: Partial<WeeklyRewardsSplittingServiceMock>) {
        Object.assign(this, init);
    }
}