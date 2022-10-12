import { Injectable } from '@nestjs/common';
import {
    GlobalInfoByWeekModel, UserInfoByWeekModel,
} from '../models/weekly-rewards-splitting.model';

@Injectable()
export class WeeklyRewardsSplittingService {

    getGlobalInfoByWeek(scAddress: string, week: number): GlobalInfoByWeekModel {
        return new GlobalInfoByWeekModel({
            scAddress: scAddress,
            week: week,
        });
    }

    getUserInfoByWeek(scAddress: string, userAddress: string, week: number): UserInfoByWeekModel {
        return new UserInfoByWeekModel({
            scAddress: scAddress,
            userAddress: userAddress,
            week: week,
        });
    }
}
