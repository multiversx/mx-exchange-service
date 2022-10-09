import { Injectable } from "@nestjs/common";
import { FeesCollectorModel, UserEntryFeesCollectorModel } from "../models/fees-collector.model";
import { WeekTimekeepingService } from "../../../submodules/week-timekeeping/services/week-timekeeping.service";
import { Mixin } from "ts-mixer";
import {
    WeeklyRewardsSplittingService
} from "../../../submodules/weekly-rewards-splitting/services/weekly-rewards-splitting.service";


@Injectable()
export class FeesCollectorService extends Mixin(WeekTimekeepingService, WeeklyRewardsSplittingService)
{
    async feesCollector(scAddress: string, week: number, token: string): Promise<FeesCollectorModel> {
        return new FeesCollectorModel({
            address: scAddress,
            week: week,
            token: token
        });
    }

    async userFeesCollector(scAddress: string, userAddress: string, week: number): Promise<UserEntryFeesCollectorModel> {
        return new UserEntryFeesCollectorModel({
            address: scAddress,
            userAddress: userAddress,
            week: week
        });
    }
}
