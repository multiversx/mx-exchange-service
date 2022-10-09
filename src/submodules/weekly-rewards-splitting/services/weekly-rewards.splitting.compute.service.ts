import { Injectable } from "@nestjs/common";
import { WeekTimekeepingGetterService } from "../../week-timekeeping/services/week-timekeeping.getter.service";
import BigNumber from "bignumber.js";

import { EsdtTokenPayment } from 'src/models/esdtTokenPayment.model';
import { WeeklyRewardsSplittingGetterService } from "./weekly-rewards.splitting.getter.service";
import { WeekTimekeepingComputeService } from "../../week-timekeeping/services/week-timekeeping.compute.service";
import { ClaimProgress, ProgressComputeService } from "./progress/progress.compute.service";

export interface TokenAmountPair {
    token: string;
    amount: BigNumber;
}

@Injectable()
export class WeeklyRewardsSplittingComputeService  {
    constructor(
        private readonly weekTimekeepingGetterService: WeekTimekeepingGetterService,
        private readonly weekTimekeepingComputeService: WeekTimekeepingComputeService,
        private readonly weeklyRewardsSplittingGetterService: WeeklyRewardsSplittingGetterService,
        private readonly progressComputeService: ProgressComputeService,
    ) {}

    async computeUserAllRewards(scAddress: string, userAddress: string, type: string): Promise<EsdtTokenPayment[]> {
        const currentWeek = await this.weekTimekeepingGetterService.getCurrentWeek(scAddress, type);
        let userProgress = await this.weeklyRewardsSplittingGetterService.currentClaimProgress(scAddress, userAddress, type);

        const totalRewards: Map<string, EsdtTokenPayment> = new Map<string, EsdtTokenPayment>();
        for (let week = userProgress.week; week < currentWeek; week++) {
            let rewardsForWeek: EsdtTokenPayment[];
            [rewardsForWeek, userProgress] = await this.computeUserRewardsForWeekUpdatingProgress(scAddress, userAddress, week, userProgress, type);
            for (const esdtReward of rewardsForWeek) {
                const tokenID = esdtReward.tokenID
                const previousRewards = await totalRewards.get(tokenID);
                if (previousRewards === undefined) {
                    totalRewards.set(tokenID, esdtReward);
                    continue
                }
                previousRewards.amount = new BigNumber(previousRewards.amount)
                    .plus(new BigNumber(esdtReward.amount))
                    .toString()
                totalRewards.set(tokenID, previousRewards);
            }
        }
        return [...totalRewards.values()]
    }

    async computeUserRewardsForWeekUpdatingProgress(scAddress: string, userAddress: string, currentWeek: number, progress: ClaimProgress, type: string): Promise<[EsdtTokenPayment[], ClaimProgress]> {
        const rewardsString = await this.weeklyRewardsSplittingGetterService.totalRewardsForWeek(scAddress, progress.week, type);
        const rewards = <TokenAmountPair[]>JSON.parse(rewardsString);
        const userRewards = await this.computeUserRewardsForWeek(scAddress, progress.week, progress.energy.amount, rewards, type);

        const nextWeek = progress.week + 1;
        const userEnergyNextWeek = await this.weeklyRewardsSplittingGetterService.userEnergyForWeek(scAddress, userAddress, nextWeek, type)
        progress = this.progressComputeService.advanceWeek(progress, userEnergyNextWeek, this.weekTimekeepingComputeService.epochsInWeek)
        return [userRewards, progress];
    }

    async computeUserRewardsForWeek(scAddress: string, week: number, energyAmount: string, totalRewards: TokenAmountPair[], type: string): Promise<EsdtTokenPayment[]> {
        const payments: EsdtTokenPayment[] = [];
        if (!new BigNumber(energyAmount).isPositive()) {
            return payments;
        }

        const totalEnergy = await this.weeklyRewardsSplittingGetterService.totalEnergyForWeek(scAddress, week, type);
        for (const weeklyRewards of totalRewards) {
            const paymentAmount = weeklyRewards.amount
                .multipliedBy(new BigNumber(energyAmount))
                .dividedBy(new BigNumber(totalEnergy))
            if (paymentAmount.comparedTo(new BigNumber(0))) {
                const payment = new EsdtTokenPayment();
                payment.amount = paymentAmount.toFixed()
                payment.nonce = 0
                payment.tokenID = weeklyRewards.token
                payments.push(new EsdtTokenPayment);
            }
        }

        return payments;
    }
}
