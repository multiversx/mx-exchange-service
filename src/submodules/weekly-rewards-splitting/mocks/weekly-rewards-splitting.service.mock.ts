import { GlobalInfoByWeekModel, UserInfoByWeekModel, } from '../models/weekly-rewards-splitting.model';
import { IWeeklyRewardsSplittingService } from '../interfaces';
import { ErrorNotImplemented } from '../../../utils/errors.constants';

export class WeeklyRewardsSplittingHandlers implements IWeeklyRewardsSplittingService{
    getGlobalInfoByWeek: (scAddress: string, week: number) => GlobalInfoByWeekModel;
    getUserInfoByWeek:(scAddress: string, userAddress: string, week: number) => UserInfoByWeekModel;

    constructor(init: Partial<WeeklyRewardsSplittingServiceMock>) {
        Object.assign(this, init);
    }
}

export class WeeklyRewardsSplittingServiceMock implements IWeeklyRewardsSplittingService {
    handlers: WeeklyRewardsSplittingHandlers;
    getGlobalInfoByWeek(scAddress: string, week: number): GlobalInfoByWeekModel {
        if (this.handlers.getGlobalInfoByWeek !== undefined) {
            return this.handlers.getGlobalInfoByWeek(scAddress, week);
        }
        ErrorNotImplemented()
    }

    getUserInfoByWeek(scAddress: string, userAddress: string, week: number): UserInfoByWeekModel {
        if (this.handlers.getUserInfoByWeek !== undefined) {
            return this.handlers.getUserInfoByWeek(scAddress, userAddress, week);
        }
        ErrorNotImplemented()
    }

    constructor(init: Partial<WeeklyRewardsSplittingHandlers>) {
        this.handlers = new WeeklyRewardsSplittingHandlers(init);
    }
}
