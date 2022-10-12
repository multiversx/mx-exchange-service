import { Injectable } from '@nestjs/common';
import {
    GlobalInfoByWeekModel, UserInfoByWeekModel,
} from '../models/weekly-rewards-splitting.model';

@Injectable()
export class WeeklyRewardsSplittingService {

    async getGlobalInfoByWeek(scAddress: string, week: number): Promise<GlobalInfoByWeekModel> {
        return new GlobalInfoByWeekModel({
            scAddress: scAddress,
            week: week,
        });
    }

    async getUserInfoByWeek(scAddress: string, userAddress: string, week: number): Promise<UserInfoByWeekModel> {
        return new UserInfoByWeekModel({
            scAddress: scAddress,
            userAddress: userAddress,
            week: week,
        });
    }
}
