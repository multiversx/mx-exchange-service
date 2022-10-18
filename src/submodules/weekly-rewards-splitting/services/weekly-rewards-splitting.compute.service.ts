import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { WeekTimekeepingGetterService } from '../../week-timekeeping/services/week-timekeeping.getter.service';
import BigNumber from 'bignumber.js';

import { EsdtTokenPayment } from 'src/models/esdtTokenPayment.model';
import { WeeklyRewardsSplittingGetterService } from './weekly-rewards-splitting.getter.service';
import { WeekTimekeepingComputeService } from '../../week-timekeeping/services/week-timekeeping.compute.service';
import { ProgressComputeService } from './progress.compute.service';
import { ClaimProgress } from '../models/weekly-rewards-splitting.model';
import { IWeeklyRewardsSplittingComputeService } from "../interfaces";

@Injectable()
export class WeeklyRewardsSplittingComputeService implements IWeeklyRewardsSplittingComputeService {
    constructor(
        private readonly weekTimekeepingGetter: WeekTimekeepingGetterService,
        private readonly weekTimekeepingCompute: WeekTimekeepingComputeService,
        @Inject(forwardRef(() => WeeklyRewardsSplittingGetterService))
        private readonly weeklyRewardsSplittingGetter: WeeklyRewardsSplittingGetterService,
        private readonly progressCompute: ProgressComputeService,
    ) {
    }

    async computeUserAllRewards(scAddress: string, userAddress: string): Promise<EsdtTokenPayment[]> {
        const currentWeek = await this.weekTimekeepingGetter.getCurrentWeek(scAddress);
        let userProgress = await this.weeklyRewardsSplittingGetter.currentClaimProgress(scAddress, userAddress);

        const totalRewards: Map<string, EsdtTokenPayment> = new Map<string, EsdtTokenPayment>();
        for (let week = userProgress.week; week < currentWeek; week++) {
            const rewardsForWeek = await this.computeUserRewardsForWeek(scAddress, week, userAddress, userProgress.energy.amount);
            userProgress = await this.advanceWeek(scAddress, userAddress, userProgress);
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

    async advanceWeek(scAddress: string, userAddress: string, progress: ClaimProgress): Promise<ClaimProgress> {
        const nextWeek = progress.week + 1;
        const userEnergyNextWeek = await this.weeklyRewardsSplittingGetter.userEnergyForWeek(scAddress, userAddress, nextWeek)
        progress = await this.progressCompute.advanceWeek(progress, userEnergyNextWeek, this.weekTimekeepingCompute.epochsInWeek)
        return progress;
    }

    async computeUserRewardsForWeek(scAddress: string, week: number, userAddress: string, energyAmount?: string): Promise<EsdtTokenPayment[]> {
        const totalRewards = await this.weeklyRewardsSplittingGetter.totalRewardsForWeek(scAddress, week);
        const payments: EsdtTokenPayment[] = [];
        if (totalRewards.length === 0) {
            return payments;
        }
        if (energyAmount === undefined) {
            const userEnergyModel = await this.weeklyRewardsSplittingGetter.userEnergyForWeek(scAddress, userAddress, week)
            energyAmount = userEnergyModel.amount
        }
        const zero = new BigNumber(0);
        const userHasEnergy = new BigNumber(energyAmount).isGreaterThan(zero);
        if (!userHasEnergy) {
            return payments;
        }

        const totalEnergy = await this.weeklyRewardsSplittingGetter.totalEnergyForWeek(scAddress, week);
        for (const weeklyRewards of totalRewards) {
            const paymentAmount = new BigNumber(weeklyRewards.amount)
                .multipliedBy(new BigNumber(energyAmount))
                .dividedBy(new BigNumber(totalEnergy))
            if (paymentAmount.isGreaterThan(zero)) {
                const payment = new EsdtTokenPayment();
                payment.amount = paymentAmount.toFixed()
                payment.nonce = 0
                payment.tokenID = weeklyRewards.tokenID
                payment.tokenType = weeklyRewards.tokenType
                payments.push(payment);
            }
        }

        return payments;
    }
}
