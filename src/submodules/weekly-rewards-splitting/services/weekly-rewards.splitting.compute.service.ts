import { Injectable } from "@nestjs/common";
import { WeekTimekeepingGetterService } from "../../week-timekeeping/week-timekeeping.getter.service";
import BigNumber from "bignumber.js";

import { EsdtTokenPayment, EsdtTokenPaymentStruct } from 'src/models/esdtTokenPayment.model';
import { WeeklyRewardsSplittingGetterService } from "./weekly-rewards.splitting.getter.service";
import { Energy } from "../../../modules/simple-lock/models/simple.lock.model";
import { WeekTimekeepingComputerService } from "../../week-timekeeping/week-timekeeping.computer.service";

interface TokenAmountPair {
    token: string;
    amount: BigNumber;
}

class ClaimProgress {
    private energy: Energy | null;
    private week: number;

    getWeek(): number {
        return this.week;
    }

    getEnergy(): Energy {
        return this.energy;
    }

    advanceWeek(nextWeekEnergy: Energy, epochsInWeek: number) {
        this.week++;

        if (nextWeekEnergy !== null) {
            this.energy = nextWeekEnergy;
            return;
        }

        const nextWeekEpoch = this.energy.getLastUpdateEpoch() + epochsInWeek;
        this.energy.deplete(nextWeekEpoch);
    }
}

@Injectable()
export abstract class WeeklyRewardsSplittingComputeService  {
    constructor(
        private readonly weekTimekeepingGetterService: WeekTimekeepingGetterService,
        private readonly weekTimekeepingComputerService: WeekTimekeepingComputerService,
        private readonly weeklyRewardsSplittingGetterService: WeeklyRewardsSplittingGetterService,
    ) {}

    async computerUserAllRewards(scAddress: string, userAddress: string) {
        const currentWeek = this.weekTimekeepingGetterService.getCurrentWeek(scAddress);

    }


    async computeUserAllRewardsStep(scAddress: string, userAddress: string, currentWeek: number, progress: ClaimProgress): Promise<EsdtTokenPayment[]> {
        const rewardsString = await this.weeklyRewardsSplittingGetterService.totalRewardsForWeek(scAddress, progress.getWeek());
        const rewards = <TokenAmountPair[]>JSON.parse(rewardsString);
        const userRewards = await this.computeUserRewardsForWeek(scAddress, progress.getWeek(), progress.getEnergy().amount, rewards);

        const nextWeek = progress.getWeek() + 1;
        const userEnergyNextWeek = await this.weeklyRewardsSplittingGetterService.userEnergyForWeek(scAddress, userAddress, nextWeek)
        progress.advanceWeek(userEnergyNextWeek, this.weekTimekeepingComputerService.epochsInWeek)
        return userRewards;
    }

    async computeUserRewardsForWeek(scAddress: string, week: number, energy: string, totalRewards: TokenAmountPair[]): Promise<EsdtTokenPayment[]> {
        const payments: EsdtTokenPayment[] = [];
        if (!new BigNumber(energy).comparedTo(new BigNumber(0))) {
            return payments;
        }

        const totalEnergy = await this.weeklyRewardsSplittingGetterService.totalEnergyForWeek(scAddress, week);
        for (const weeklyRewards of totalRewards) {
            const paymentAmount = weeklyRewards.amount.multipliedBy(energy).dividedBy(new BigNumber(totalEnergy))
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
