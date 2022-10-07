import { Injectable } from "@nestjs/common";
import { WeekForEpochModel, WeeklyTimekeepingModel } from "../models/weekly-timekeeping.model";


@Injectable()
export class WeeklyTimekeepingService {
    getWeeklyTimekeeping(scAddress: string, week: number): WeeklyTimekeepingModel {
        return new WeeklyTimekeepingModel({
            scAddress: scAddress,
            week: week,
        });
    }

    getWeekForEpoch(scAddress: string, epoch: number): WeekForEpochModel {
        return new WeekForEpochModel({
            scAddress: scAddress,
            epoch: epoch,
        });
    }
}
