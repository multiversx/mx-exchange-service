import { Injectable } from "@nestjs/common";
import { UserWeeklyRewardsSplittingModel, WeeklyRewardsSplittingModel } from "../models/weekly-rewards-splitting.model";
import { WeeklyRewardsSplittingGetterService } from "./weekly-rewards.splitting.getter.service";
import { TokenAmountPair } from "./weekly-rewards.splitting.compute.service";


@Injectable()
export class WeeklyRewardsSplittingService {
    constructor(
        private readonly getterService: WeeklyRewardsSplittingGetterService,
    ) {}

    async getTotalRewardsForWeekByToken(scAddress: string, week: number, token: string, type: string): Promise<string> {
        const rewardsString = await this.getterService.totalRewardsForWeek(scAddress, week, type);
        if (rewardsString.length === 0) {
            return "0"
        }
        const rewards = <TokenAmountPair[]>JSON.parse(rewardsString);
        for (const pair of rewards) {
            if (pair.token == token) {
                return pair.amount.toString()
            }
        }
    }

    async getWeeklyRewardsSplit(scAddress: string, week: number, type: string): Promise<WeeklyRewardsSplittingModel> {
        return new WeeklyRewardsSplittingModel({
            scAddress: scAddress,
            week: week,
            type: type
        });
    }

    async getUserWeeklyRewardsSplit(scAddress: string, userAddress: string, week: number, type: string): Promise<UserWeeklyRewardsSplittingModel> {
        const [
            claimProgress,
            energyForWeek,
            lastActiveWeekForUser,
        ] = await Promise.all([
            this.getterService.currentClaimProgress(scAddress, userAddress, type),
            this.getterService.userEnergyForWeek(scAddress, userAddress, week, type),
            this.getterService.lastActiveWeekForUser(scAddress, userAddress, type),
        ]);
        return new UserWeeklyRewardsSplittingModel({
            scAddress: scAddress,
            week: week,
            claimProgress: claimProgress,
            energyForWeek: energyForWeek,
            lastActiveWeekForUser: lastActiveWeekForUser,
            type: type
        });
    }
}
