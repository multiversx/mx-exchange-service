import { Injectable } from '@nestjs/common';
import {
    FeesCollectorModel,
    UserEntryFeesCollectorModel,
} from '../models/fees-collector.model';
import { EsdtTokenPayment } from '../../../models/esdtTokenPayment.model';
import { UserInfoByWeekModel } from '../../../submodules/weekly-rewards-splitting/models/weekly-rewards-splitting.model';
import { constantsConfig } from '../../../config';
import BigNumber from 'bignumber.js';
import { WeekTimekeepingModel } from 'src/submodules/week-timekeeping/models/week-timekeeping.model';
import { WeeklyRewardsSplittingAbiService } from 'src/submodules/weekly-rewards-splitting/services/weekly-rewards-splitting.abi.service';
import { FeesCollectorStateService } from 'src/modules/state/services/fees.collector.state.service';

@Injectable()
export class FeesCollectorService {
    constructor(
        private readonly weeklyRewardsSplittingAbi: WeeklyRewardsSplittingAbiService,
        private readonly feesCollectorState: FeesCollectorStateService,
    ) {}

    async feesCollector(): Promise<FeesCollectorModel> {
        return this.feesCollectorState.getFeesCollector();
    }

    async userFeesCollector(
        scAddress: string,
        userAddress: string,
    ): Promise<UserEntryFeesCollectorModel> {
        const [lastActiveWeekForUser, feesCollector] = await Promise.all([
            this.weeklyRewardsSplittingAbi.lastActiveWeekForUser(
                scAddress,
                userAddress,
            ),
            this.feesCollectorState.getFeesCollector(['address', 'time']),
        ]);
        const { currentWeek } = feesCollector.time;
        const lastWeek = currentWeek - 1;
        return new UserEntryFeesCollectorModel({
            address: scAddress,
            userAddress: userAddress,
            startWeek:
                lastActiveWeekForUser === 0
                    ? currentWeek
                    : Math.max(
                          currentWeek - constantsConfig.USER_MAX_CLAIM_WEEKS,
                          lastActiveWeekForUser,
                      ),
            endWeek: lastWeek,
            time: new WeekTimekeepingModel({
                scAddress: scAddress,
                ...feesCollector.time,
            }),
            lastActiveWeekForUser,
        });
    }

    getUserWeeklyRewardsSplit(
        scAddress: string,
        userAddress: string,
        startWeek: number,
        endWeek: number,
    ): UserInfoByWeekModel[] {
        const modelsList = [];
        for (let week = startWeek; week <= endWeek; week++) {
            if (week < 1) {
                continue;
            }
            modelsList.push(
                new UserInfoByWeekModel({
                    scAddress,
                    userAddress,
                    week,
                }),
            );
        }
        return modelsList;
    }

    async getUserAccumulatedRewards(
        scAddress: string,
        userAddress: string,
        currentWeek: number,
    ): Promise<EsdtTokenPayment[]> {
        const [currentClaimProgress, feesCollector] = await Promise.all([
            this.weeklyRewardsSplittingAbi.currentClaimProgress(
                scAddress,
                userAddress,
            ),
            this.feesCollectorState.getFeesCollector([
                'address',
                'accumulatedFees',
                'undistributedRewards',
            ]),
        ]);

        if (
            currentClaimProgress.week === 0 ||
            new BigNumber(currentClaimProgress.energy.amount).isZero()
        ) {
            return [];
        }

        const totalEnergyForWeek =
            feesCollector.undistributedRewards.find(
                (globalInfo) => globalInfo.week === currentWeek,
            ).totalEnergyForWeek ?? '0';

        const { accumulatedFees } = feesCollector;

        const accumulatedRewards = [];
        const percentage = new BigNumber(
            currentClaimProgress.energy.amount,
        ).dividedBy(totalEnergyForWeek);

        for (const payment of accumulatedFees) {
            accumulatedRewards.push(
                new EsdtTokenPayment({
                    amount: new BigNumber(payment.amount)
                        .multipliedBy(percentage)
                        .integerValue()
                        .toFixed(),
                    nonce: payment.nonce,
                    tokenID: payment.tokenID,
                    tokenType: payment.tokenType,
                }),
            );
        }
        return accumulatedRewards;
    }
}
