import { Injectable } from "@nestjs/common";
import { WeekTimekeepingGetterService } from "../../week-timekeeping/services/week-timekeeping.getter.service";
import BigNumber from "bignumber.js";

import { EsdtTokenPayment } from 'src/models/esdtTokenPayment.model';
import { WeeklyRewardsSplittingGetterService } from "./weekly-rewards.splitting.getter.service";
import { WeekTimekeepingComputeService } from "../../week-timekeeping/services/week-timekeeping.compute.service";
import { ProgressComputeService } from "./progress.compute.service";
import { ClaimProgress } from "../models/weekly-rewards-splitting.model";

interface TokenAmountPair {
    token: string;
    amount: BigNumber;
}

@Injectable()
export class WeeklyRewardsSplittingComputeService  {
    constructor(
        private readonly weekTimekeepingGetter: WeekTimekeepingGetterService,
        private readonly weekTimekeepingCompute: WeekTimekeepingComputeService,
        private readonly weeklyRewardsSplittingGetter: WeeklyRewardsSplittingGetterService,
        private readonly progressCompute: ProgressComputeService,
    ) {}

    async computeUserAllRewards(scAddress: string, userAddress: string): Promise<EsdtTokenPayment[]> {
        const currentWeek = await this.weekTimekeepingGetter.getCurrentWeek(scAddress);
        let userProgress = await this.weeklyRewardsSplittingGetter.currentClaimProgress(scAddress, userAddress);

        const totalRewards: Map<string, EsdtTokenPayment> = new Map<string, EsdtTokenPayment>();
        for (let week = userProgress.week; week < currentWeek; week++) {
            let rewardsForWeek: EsdtTokenPayment[];
            [rewardsForWeek, userProgress] = await this.computeUserRewardsForWeekUpdatingProgress(scAddress, userAddress, week, userProgress);
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

    async computeUserRewardsForWeekUpdatingProgress(scAddress: string, userAddress: string, currentWeek: number, progress: ClaimProgress): Promise<[EsdtTokenPayment[], ClaimProgress]> {
        const rewardsString = await this.weeklyRewardsSplittingGetter.totalRewardsForWeek(scAddress, progress.week);
        const rewards = <TokenAmountPair[]>JSON.parse(rewardsString);
        const userRewards = await this.computeUserRewardsForWeek(scAddress, progress.week, progress.energy.amount, rewards);

        const nextWeek = progress.week + 1;
        const userEnergyNextWeek = await this.weeklyRewardsSplittingGetter.userEnergyForWeek(scAddress, userAddress, nextWeek)
        progress = this.progressCompute.advanceWeek(progress, userEnergyNextWeek, this.weekTimekeepingCompute.epochsInWeek)
        return [userRewards, progress];
    }

    async computeUserRewardsForWeek(scAddress: string, week: number, energyAmount: string, totalRewards: TokenAmountPair[]): Promise<EsdtTokenPayment[]> {
        const payments: EsdtTokenPayment[] = [];
        if (!new BigNumber(energyAmount).isPositive()) {
            return payments;
        }

        const totalEnergy = await this.weeklyRewardsSplittingGetter.totalEnergyForWeek(scAddress, week);
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
