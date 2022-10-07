import { Injectable } from "@nestjs/common";
import { WeekForEpochModel, WeeklyTimekeepingModel } from "../models/weekly-timekeeping.model";


@Injectable()
export class WeeklyTimekeepingService {
    async getWeeklyTimekeeping(scAddress: string, week: number): Promise<WeeklyTimekeepingModel> {
        return new WeeklyTimekeepingModel({
            scAddress: scAddress,
            week: week,
        });
    }

    async getWeekForEpoch(scAddress: string, epoch: number): Promise<WeekForEpochModel> {
        return new WeekForEpochModel({
            scAddress: scAddress,
            epoch: epoch,
        });
    }
}
