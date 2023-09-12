import { Injectable } from '@nestjs/common';
import {
    FeesCollectorModel,
    UserEntryFeesCollectorModel,
} from '../models/fees-collector.model';
import { EsdtTokenPayment } from '../../../models/esdtTokenPayment.model';
import {
    GlobalInfoByWeekModel,
    UserInfoByWeekModel,
} from '../../../submodules/weekly-rewards-splitting/models/weekly-rewards-splitting.model';
import { constantsConfig } from '../../../config';
import BigNumber from 'bignumber.js';
import { WeekTimekeepingModel } from 'src/submodules/week-timekeeping/models/week-timekeeping.model';
import { FeesCollectorAbiService } from './fees-collector.abi.service';
import { FeesCollectorComputeService } from './fees-collector.compute.service';
import { WeekTimekeepingAbiService } from 'src/submodules/week-timekeeping/services/week-timekeeping.abi.service';
import { WeeklyRewardsSplittingAbiService } from 'src/submodules/weekly-rewards-splitting/services/weekly-rewards-splitting.abi.service';

@Injectable()
export class FeesCollectorService {
    constructor(
        private readonly feesCollectorAbi: FeesCollectorAbiService,
        private readonly feesCollectorCompute: FeesCollectorComputeService,
        private readonly weekTimekeepingAbi: WeekTimekeepingAbiService,
        private readonly weeklyRewardsSplittingAbi: WeeklyRewardsSplittingAbiService,
    ) {}

    async getAccumulatedFees(
        scAddress: string,
        week: number,
        allTokens: string[],
    ): Promise<EsdtTokenPayment[]> {
        const accumulatedFees: EsdtTokenPayment[] = [];

        const promises = allTokens.map((token) =>
            this.feesCollectorAbi.accumulatedFees(week, token),
        );

        const accumulatedFeesByToken = await Promise.all(promises);

        accumulatedFeesByToken.forEach((accumulatedFee, index) => {
            accumulatedFees.push(
                new EsdtTokenPayment({
                    tokenID: allTokens[index],
                    tokenType: 0,
                    amount: accumulatedFee,
                    nonce: 0,
                }),
            );
        });

        const [lockedTokenId, accumulatedTokenForInflation] = await Promise.all(
            [
                this.feesCollectorAbi.lockedTokenID(),
                this.feesCollectorCompute.accumulatedFeesUntilNow(
                    scAddress,
                    week,
                ),
            ],
        );
        accumulatedFees.push(
            new EsdtTokenPayment({
                tokenID: `Minted${lockedTokenId}`,
                tokenType: 0,
                amount: accumulatedTokenForInflation,
                nonce: 0,
            }),
        );

        return accumulatedFees;
    }

    async feesCollector(scAddress: string): Promise<FeesCollectorModel> {
        const [allToken, currentWeek] = await Promise.all([
            this.feesCollectorAbi.allTokens(),
            this.weekTimekeepingAbi.currentWeek(scAddress),
        ]);
        return new FeesCollectorModel({
            address: scAddress,
            time: new WeekTimekeepingModel({
                scAddress: scAddress,
                currentWeek: currentWeek,
            }),
            startWeek: currentWeek - constantsConfig.USER_MAX_CLAIM_WEEKS,
            endWeek: currentWeek,
            allTokens: allToken,
        });
    }

    async userFeesCollector(
        scAddress: string,
        userAddress: string,
    ): Promise<UserEntryFeesCollectorModel> {
        const [lastActiveWeekForUser, currentWeek] = await Promise.all([
            this.weeklyRewardsSplittingAbi.lastActiveWeekForUser(
                scAddress,
                userAddress,
            ),
            this.weekTimekeepingAbi.currentWeek(scAddress),
        ]);
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
                currentWeek: currentWeek,
            }),
        });
    }

    getWeeklyRewardsSplit(
        scAddress: string,
        startWeek: number,
        endWeek: number,
    ): GlobalInfoByWeekModel[] {
        const modelsList = [];
        for (let week = startWeek; week <= endWeek; week++) {
            if (week < 1) {
                continue;
            }
            modelsList.push(
                new GlobalInfoByWeekModel({
                    scAddress,
                    week,
                }),
            );
        }
        return modelsList;
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
        const allTokens = await this.feesCollectorAbi.allTokens();
        const [accumulatedFees, totalEnergyForWeek, currentClaimProgress] =
            await Promise.all([
                this.getAccumulatedFees(scAddress, currentWeek, allTokens),
                this.weeklyRewardsSplittingAbi.totalEnergyForWeek(
                    scAddress,
                    currentWeek,
                ),
                this.weeklyRewardsSplittingAbi.currentClaimProgress(
                    scAddress,
                    userAddress,
                ),
            ]);

        if (
            currentClaimProgress.week === 0 ||
            new BigNumber(currentClaimProgress.energy.amount).isZero()
        ) {
            return [];
        }

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
