import { Injectable } from "@nestjs/common";
import { UserWeeklyRewardsSplittingModel, WeeklyRewardsSplittingModel } from "../models/weekly-rewards-splitting.model";
import { WeeklyRewardsSplittingGetterService } from "./weekly-rewards.splitting.getter.service";


@Injectable()
export abstract class WeeklyRewardsSplittingService {
    constructor(
        private readonly getterService: WeeklyRewardsSplittingGetterService,
    ) {
    }
    getWeeklyRewardsSplit(scAddress: string, week: number): WeeklyRewardsSplittingModel {
        return new WeeklyRewardsSplittingModel({
            scAddress: scAddress,
            week: week,
        });
    }

    async getUserWeeklyRewardsSplit(scAddress: string, userAddress: string, week: number): Promise<UserWeeklyRewardsSplittingModel> {
        return new UserWeeklyRewardsSplittingModel({
            scAddress: scAddress,
            week: week,
            claimProgress: await this.getterService.currentClaimProgress(scAddress, userAddress),
            energyFrorWeek: await this.getterService.userEnergyForWeek(scAddress, userAddress, week),
            lastActiveWeekForUser: await this.getterService.lastActiveWeekForUser(scAddress, userAddress)
        });
    }
}
