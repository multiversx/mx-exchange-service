import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { WeekTimekeepingGetterService } from '../../week-timekeeping/services/week-timekeeping.getter.service';
import BigNumber from 'bignumber.js';

import { EsdtTokenPayment } from 'src/models/esdtTokenPayment.model';
import { WeeklyRewardsSplittingGetterService } from './weekly-rewards-splitting.getter.service';
import { WeekTimekeepingComputeService } from '../../week-timekeeping/services/week-timekeeping.compute.service';
import { ProgressComputeService } from './progress.compute.service';
import { ClaimProgress } from '../models/weekly-rewards-splitting.model';
import { IWeeklyRewardsSplittingComputeService } from '../interfaces';
import { constantsConfig, scAddress } from '../../../config';
import { PairComputeService } from '../../../modules/pair/services/pair.compute.service';
import { EnergyGetterService } from '../../../modules/energy/services/energy.getter.service';
import { TokenComputeService } from '../../../modules/tokens/services/token.compute.service';

@Injectable()
export class WeeklyRewardsSplittingComputeService
    implements IWeeklyRewardsSplittingComputeService
{
    constructor(
        protected readonly weekTimekeepingGetter: WeekTimekeepingGetterService,
        protected readonly weekTimekeepingCompute: WeekTimekeepingComputeService,
        @Inject(forwardRef(() => WeeklyRewardsSplittingGetterService))
        protected readonly weeklyRewardsSplittingGetter: WeeklyRewardsSplittingGetterService,
        protected readonly progressCompute: ProgressComputeService,
        protected readonly pairCompute: PairComputeService,
        protected readonly energyGetter: EnergyGetterService,
        protected readonly tokenCompute: TokenComputeService,
    ) {}

    async computeUserAllRewards(
        scAddress: string,
        userAddress: string,
    ): Promise<EsdtTokenPayment[]> {
        const currentWeek = await this.weekTimekeepingGetter.getCurrentWeek(
            scAddress,
        );
        let userProgress =
            await this.weeklyRewardsSplittingGetter.currentClaimProgress(
                scAddress,
                userAddress,
            );

        const totalRewards: Map<string, EsdtTokenPayment> = new Map<
            string,
            EsdtTokenPayment
        >();

        const startWeek = userProgress.week === 0 ? currentWeek : Math.max(currentWeek - constantsConfig.USER_MAX_CLAIM_WEEKS, userProgress.week)
        for (let week = startWeek; week < currentWeek; week++) {
            if (week < 1) {
                continue;
            }
            const rewardsForWeek = await this.computeUserRewardsForWeek(
                scAddress,
                week,
                userAddress,
                userProgress.energy.amount,
            );
            userProgress = await this.advanceWeek(
                scAddress,
                userAddress,
                userProgress,
            );
            for (const esdtReward of rewardsForWeek) {
                const tokenID = esdtReward.tokenID;
                const previousRewards = await totalRewards.get(tokenID);
                if (previousRewards === undefined) {
                    totalRewards.set(tokenID, esdtReward);
                    continue;
                }
                previousRewards.amount = new BigNumber(previousRewards.amount)
                    .plus(new BigNumber(esdtReward.amount))
                    .toFixed();
                totalRewards.set(tokenID, previousRewards);
            }
        }
        return [...totalRewards.values()];
    }

    async advanceWeek(
        scAddress: string,
        userAddress: string,
        progress: ClaimProgress,
    ): Promise<ClaimProgress> {
        const nextWeek = progress.week + 1;
        const userEnergyNextWeek =
            await this.weeklyRewardsSplittingGetter.userEnergyForWeek(
                scAddress,
                userAddress,
                nextWeek,
            );
        progress = this.progressCompute.advanceWeek(
            progress,
            userEnergyNextWeek,
            this.weekTimekeepingCompute.epochsInWeek,
        );
        return progress;
    }

    async computeUserRewardsForWeek(
        scAddress: string,
        week: number,
        userAddress: string,
        energyAmount?: string,
        liquidity?: string,
    ): Promise<EsdtTokenPayment[]> {
        const totalRewards =
            await this.weeklyRewardsSplittingGetter.totalRewardsForWeek(
                scAddress,
                week,
            );
        const payments: EsdtTokenPayment[] = [];
        if (totalRewards.length === 0) {
            return payments;
        }
        if (energyAmount === undefined) {
            const userEnergyModel =
                await this.weeklyRewardsSplittingGetter.userEnergyForWeek(
                    scAddress,
                    userAddress,
                    week,
                );
            energyAmount = userEnergyModel.amount;
        }
        const zero = new BigNumber(0);
        const userHasEnergy = new BigNumber(energyAmount).isGreaterThan(zero);
        if (!userHasEnergy) {
            return payments;
        }

        const totalEnergy =
            await this.weeklyRewardsSplittingGetter.totalEnergyForWeek(
                scAddress,
                week,
            );
        for (const weeklyRewards of totalRewards) {
            const paymentAmount = new BigNumber(weeklyRewards.amount)
                .multipliedBy(new BigNumber(energyAmount))
                .dividedBy(new BigNumber(totalEnergy));
            if (paymentAmount.isGreaterThan(zero)) {
                const payment = new EsdtTokenPayment();
                payment.amount = paymentAmount.integerValue().toFixed();
                payment.nonce = 0;
                payment.tokenID = weeklyRewards.tokenID;
                payment.tokenType = weeklyRewards.tokenType;
                payments.push(payment);
            }
        }

        return payments;
    }

    async computeTotalRewardsForWeekPriceUSD(
        scAddress: string,
        week: number,
        totalRewardsForWeek: EsdtTokenPayment[],
    ): Promise<string> {
        let totalPriceUSD = new BigNumber('0');
        for (const token of totalRewardsForWeek) {
            const tokenPriceUSD =
                await this.tokenCompute.computeTokenPriceDerivedUSD(
                    token.tokenID,
                );
            const rewardsPriceUSD = new BigNumber(tokenPriceUSD).multipliedBy(
                new BigNumber(token.amount),
            );
            totalPriceUSD = totalPriceUSD.plus(rewardsPriceUSD);
        }
        return totalPriceUSD.toFixed();
    }

    async computeTotalLockedTokensForWeekPriceUSD(
        address: string,
        week: number,
        totalLockedTokensForWeek: string,
    ): Promise<string> {
        const baseAssetTokenID = await this.energyGetter.getBaseAssetTokenID();
        let tokenPriceUSD = '0';
        if (scAddress.has(baseAssetTokenID)) {
            tokenPriceUSD = await this.tokenCompute.computeTokenPriceDerivedUSD(
                baseAssetTokenID,
            );
        }
        return new BigNumber(totalLockedTokensForWeek)
            .multipliedBy(new BigNumber(tokenPriceUSD))
            .toFixed();
    }

    async computeAprGivenLockedTokensAndRewards(
        scAddress: string,
        week: number,
        totalLockedTokensForWeek: string,
        totalRewardsForWeek: EsdtTokenPayment[],
    ): Promise<string> {
        const totalLockedTokensForWeekPriceUSD =
            await this.computeTotalLockedTokensForWeekPriceUSD(
                scAddress,
                week,
                totalLockedTokensForWeek,
            );
        const totalRewardsForWeekPriceUSD =
            await this.computeTotalRewardsForWeekPriceUSD(
                scAddress,
                week,
                totalRewardsForWeek,
            );

        return new BigNumber(totalRewardsForWeekPriceUSD)
            .times(52)
            .div(totalLockedTokensForWeekPriceUSD)
            .toFixed();
    }

    async computeApr(scAddress: string, week: number): Promise<string> {
        const totalLockedTokensForWeek =
            await this.weeklyRewardsSplittingGetter.totalLockedTokensForWeek(
                scAddress,
                week,
            );
        const totalRewardsForWeek =
            await this.weeklyRewardsSplittingGetter.totalRewardsForWeek(
                scAddress,
                week,
            );
        return this.computeAprGivenLockedTokensAndRewards(
            scAddress,
            week,
            totalLockedTokensForWeek,
            totalRewardsForWeek,
        );
    }

    async computeUserApr(
        scAddress: string,
        userAddress: string,
        week: number,
    ): Promise<string> {
        const totalLockedTokensForWeek =
            await this.weeklyRewardsSplittingGetter.totalLockedTokensForWeek(
                scAddress,
                week,
            );
        const totalRewardsForWeek =
            await this.weeklyRewardsSplittingGetter.totalRewardsForWeek(
                scAddress,
                week,
            );
        const globalApr = await this.computeAprGivenLockedTokensAndRewards(
            scAddress,
            week,
            totalLockedTokensForWeek,
            totalRewardsForWeek,
        );

        const totalEnergyForWeek =
            await this.weeklyRewardsSplittingGetter.totalEnergyForWeek(
                scAddress,
                week,
            );
        const userEnergyForWeek =
            await this.weeklyRewardsSplittingGetter.userEnergyForWeek(
                scAddress,
                userAddress,
                week,
            );
        const apr = new BigNumber(globalApr)
            .multipliedBy(new BigNumber(userEnergyForWeek.amount))
            .multipliedBy(new BigNumber(totalLockedTokensForWeek))
            .div(new BigNumber(totalEnergyForWeek))
            .div(new BigNumber(userEnergyForWeek.totalLockedTokens))
            .toFixed();
        return apr;
    }
}
