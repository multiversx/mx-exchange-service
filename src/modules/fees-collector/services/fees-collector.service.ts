import { Injectable } from '@nestjs/common';
import { FeesCollectorModel, UserEntryFeesCollectorModel } from '../models/fees-collector.model';
import { FeesCollectorGetterService } from './fees-collector.getter.service';
import { EsdtTokenPayment } from '../../../models/esdtTokenPayment.model';
import { WeekTimekeepingService } from '../../../submodules/week-timekeeping/services/week-timekeeping.service';
import {
    WeeklyRewardsSplittingService,
} from '../../../submodules/weekly-rewards-splitting/services/weekly-rewards-splitting.service';


@Injectable()
export class FeesCollectorService {
    constructor(
        private readonly feesCollectorGetterService: FeesCollectorGetterService,
        private readonly weekTimekeepingService: WeekTimekeepingService,
        private readonly weeklyRewardsSplittingService: WeeklyRewardsSplittingService,
    ) {
    }

    async getAccumulatedFees(scAddress: string, week: number, allTokens: string[]): Promise<EsdtTokenPayment[]> {
        const accumulatedFees: EsdtTokenPayment[] = []

        for (const token of allTokens) {
            accumulatedFees.push(new EsdtTokenPayment({
                tokenID: token,
                tokenType: 0,
                amount: await this.feesCollectorGetterService.getAccumulatedFees(scAddress, week, token),
                nonce: 0,
            }))
        }
        return accumulatedFees
    }

    async feesCollector(scAddress: string): Promise<FeesCollectorModel> {
        const [
            time,
            allToken,
        ] = await Promise.all([
            this.weekTimekeepingService.getWeeklyTimekeeping(scAddress),
            this.feesCollectorGetterService.getAllTokens(scAddress),
        ])

        return new FeesCollectorModel({
            address: scAddress,
            time: time,
            allTokens: allToken,
        });
    }

    async userFeesCollector(scAddress: string, userAddress: string): Promise<UserEntryFeesCollectorModel> {
        const time = await this.weekTimekeepingService.getWeeklyTimekeeping(scAddress);
        return new UserEntryFeesCollectorModel({
            address: scAddress,
            userAddress: userAddress,
            time: time,
        });
    }

    getWeeklyRewardsSplitPromises(scAddress: string, currentWeek: number) {
        const promisesList = []
        for (let week = 1; week <= currentWeek; week++) {
            promisesList.push(this.weeklyRewardsSplittingService.getWeeklyRewardsSplit(scAddress, week))
        }
        return promisesList;
    }

    getUserWeeklyRewardsSplitPromises(scAddress: string, userAddress: string, currentWeek: number) {
        const promisesList = []
        for (let week = 1; week <= currentWeek; week++) {
            promisesList.push(this.weeklyRewardsSplittingService.getUserWeeklyRewardsSplit(scAddress, userAddress, week))
        }
        return promisesList;
    }
}
