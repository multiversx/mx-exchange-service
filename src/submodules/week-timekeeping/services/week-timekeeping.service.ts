import { Injectable } from "@nestjs/common";
import { WeekForEpochModel, WeekTimekeepingModel } from "../models/week-timekeeping.model";


@Injectable()
export class WeekTimekeepingService {
    async getWeeklyTimekeeping(scAddress: string, week: number): Promise<WeekTimekeepingModel> {
        return new WeekTimekeepingModel({
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
