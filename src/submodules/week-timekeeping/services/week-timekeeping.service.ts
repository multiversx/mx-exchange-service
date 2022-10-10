import { Injectable } from "@nestjs/common";
import { WeekForEpochModel, WeekTimekeepingModel } from "../models/week-timekeeping.model";
import { WeekTimekeepingGetterService } from "./week-timekeeping.getter.service";


@Injectable()
export class WeekTimekeepingService {
    constructor(
        private readonly weekTimekeepingGetterService: WeekTimekeepingGetterService,
    ) {
    }
    async getWeeklyTimekeeping(scAddress: string): Promise<WeekTimekeepingModel> {
        const currentWeek = await this.weekTimekeepingGetterService.getCurrentWeek(scAddress);
        return new WeekTimekeepingModel({
            scAddress: scAddress,
            currentWeek: currentWeek
        });
    }

    async getWeekForEpoch(scAddress: string, epoch: number): Promise<WeekForEpochModel> {
        return new WeekForEpochModel({
            scAddress: scAddress,
            epoch: epoch,
        });
    }
}
