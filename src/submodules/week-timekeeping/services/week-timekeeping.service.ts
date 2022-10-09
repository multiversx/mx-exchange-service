import { Injectable } from "@nestjs/common";
import { WeekForEpochModel, WeekTimekeepingModel } from "../models/week-timekeeping.model";


@Injectable()
export class WeekTimekeepingService {
    async getWeeklyTimekeeping(scAddress: string, week: number, type: string): Promise<WeekTimekeepingModel> {
        return new WeekTimekeepingModel({
            scAddress: scAddress,
            week: week,
            type: type
        });
    }

    async getWeekForEpoch(scAddress: string, epoch: number, type: string): Promise<WeekForEpochModel> {
        return new WeekForEpochModel({
            scAddress: scAddress,
            epoch: epoch,
            type: type
        });
    }
}
