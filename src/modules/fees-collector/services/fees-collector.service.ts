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

    async feesCollector(scAddress: string, startWeek: number, endWeek: number): Promise<FeesCollectorModel> {
        const [
            time,
            allToken,
        ] = await Promise.all([
            this.weekTimekeepingService.getWeeklyTimekeeping(scAddress),
            this.feesCollectorGetterService.getAllTokens(scAddress),
        ])

        const [start, end] = this.validateAndSetIfUndefined(startWeek, endWeek, time.currentWeek);

        return new FeesCollectorModel({
            address: scAddress,
            startWeek: start,
            endWeek: end,
            time: time,
            allTokens: allToken,
        });
    }

    async userFeesCollector(scAddress: string, userAddress: string, startWeek: number, endWeek: number): Promise<UserEntryFeesCollectorModel> {
        const time = await this.weekTimekeepingService.getWeeklyTimekeeping(scAddress);
        const [start, end] = this.validateAndSetIfUndefined(startWeek, endWeek, time.currentWeek);
        return new UserEntryFeesCollectorModel({
            address: scAddress,
            userAddress: userAddress,
            startWeek: start,
            endWeek: end,
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

    private validateAndSetIfUndefined(startWeek: number, endWeek: number, currentWeek: number) {
        if (startWeek === undefined && endWeek === undefined) {
            return [1, currentWeek]
        }

        if (startWeek !== undefined) {
            if (startWeek > currentWeek) {
                throw new Error('Invalid start week');
            }
        } else {
            startWeek = 1
        }

        if (endWeek !== undefined) {
            if (endWeek > currentWeek) {
                throw new Error('Invalid end week');
            }
        } else {
            endWeek = startWeek
        }

        return [startWeek, endWeek]
    }
}
