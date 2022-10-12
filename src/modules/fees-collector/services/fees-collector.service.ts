import { Injectable } from '@nestjs/common';
import { FeesCollectorModel, UserEntryFeesCollectorModel } from '../models/fees-collector.model';
import { FeesCollectorGetterService } from './fees-collector.getter.service';
import { EsdtTokenPayment } from '../../../models/esdtTokenPayment.model';
import { WeekTimekeepingService } from '../../../submodules/week-timekeeping/services/week-timekeeping.service';
import {
    WeeklyRewardsSplittingService,
} from '../../../submodules/weekly-rewards-splitting/services/weekly-rewards-splitting.service';
import { WeekFilterPeriodModel } from '../../../submodules/weekly-rewards-splitting/models/weekly-rewards-splitting.model';


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

    async feesCollector(
        scAddress: string,
        weekFilter: WeekFilterPeriodModel,
    ): Promise<FeesCollectorModel> {

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
            startWeek: weekFilter.start,
            endWeek: weekFilter.end,
            allTokens: allToken,
        });
    }

    async userFeesCollector(
        scAddress: string,
        userAddress: string,
        weekFilter: WeekFilterPeriodModel
    ): Promise<UserEntryFeesCollectorModel> {
        const time = await this.weekTimekeepingService.getWeeklyTimekeeping(scAddress);
        return new UserEntryFeesCollectorModel({
            address: scAddress,
            userAddress: userAddress,
            startWeek: weekFilter.start,
            endWeek: weekFilter.end,
            time: time,
        });
    }

    getWeeklyRewardsSplitPromises(scAddress: string, startWeek: number, endWeek: number) {
        const promisesList = []
        for (let week = startWeek; week <= endWeek; week++) {
            promisesList.push(this.weeklyRewardsSplittingService.getGlobalInfoByWeek(scAddress, week))
        }
        return promisesList;
    }

    getUserWeeklyRewardsSplitPromises(scAddress: string, userAddress: string, startWeek: number, endWeek: number) {
        const promisesList = []
        for (let week = startWeek; week <= endWeek; week++) {
            promisesList.push(this.weeklyRewardsSplittingService.getUserInfoByWeek(scAddress, userAddress, week))
        }
        return promisesList;
    }
}
