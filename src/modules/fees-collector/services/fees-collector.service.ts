import { Injectable } from '@nestjs/common';
import { FeesCollectorModel, UserEntryFeesCollectorModel } from '../models/fees-collector.model';
import { FeesCollectorGetterService } from './fees-collector.getter.service';
import { EsdtTokenPayment } from '../../../models/esdtTokenPayment.model';
import { WeekTimekeepingService } from '../../../submodules/week-timekeeping/services/week-timekeeping.service';
import {
    WeeklyRewardsSplittingService,
} from '../../../submodules/weekly-rewards-splitting/services/weekly-rewards-splitting.service';
import {
    GlobalInfoByWeekModel,
    UserInfoByWeekModel,
    WeekFilterPeriodModel,
} from '../../../submodules/weekly-rewards-splitting/models/weekly-rewards-splitting.model';
import { TransactionModel } from '../../../models/transaction.model';
import {
    WeekTimekeepingGetterService,
} from '../../../submodules/week-timekeeping/services/week-timekeeping.getter.service';
import {
    WeeklyRewardsSplittingGetterService,
} from '../../../submodules/weekly-rewards-splitting/services/weekly-rewards-splitting.getter.service';
import { elrondConfig, gasConfig } from '../../../config';
import { ElrondProxyService } from '../../../services/elrond-communication/elrond-proxy.service';


@Injectable()
export class FeesCollectorService {
    constructor(
        private readonly feesCollectorGetterService: FeesCollectorGetterService,
        private readonly elrondProxy: ElrondProxyService,
        private readonly weekTimekeepingService: WeekTimekeepingService,
        private readonly weeklyRewardsSplittingService: WeeklyRewardsSplittingService,
        private readonly weekTimekeepingGetter: WeekTimekeepingGetterService,
        private readonly weeklyRewardsSplittingGetter: WeeklyRewardsSplittingGetterService,
    ) {
    }

    async claimRewardsBatch(
        scAddress: string,
        userAddress: string,
    ): Promise<TransactionModel[]> {
        const transactions: TransactionModel[] = [];
        const currentWeek = await this.weekTimekeepingGetter.getCurrentWeek(scAddress);
        const lastActiveWeekForUser = await this.weeklyRewardsSplittingGetter.lastActiveWeekForUser(scAddress, userAddress);
        for (let week = lastActiveWeekForUser; week < currentWeek; week += 4) {
            const claimTransaction = await this.claimRewards(userAddress, gasConfig.feesCollector.claimRewards);
            transactions.push(claimTransaction);
        }
        return transactions;
    }

    async claimRewards(
        sender: string,
        gasLimit: number,
    ): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getFeesCollectorContract();
        return contract.methodsExplicit
            .claimRewards()
            .withGasLimit(gasLimit)
            .withChainID(elrondConfig.chainID)
            .buildTransaction()
            .toPlainObject();
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

    async getAccumulatedLockedFees(scAddress: string, week: number, allTokens: string[]): Promise<EsdtTokenPayment[]> {
        const promisesList = [];
        for (const token of allTokens) {
            promisesList.push(this.feesCollectorGetterService.getAccumulatedLockedFees(scAddress, week, token));
        }

        const accumulatedFees = (await Promise.all(promisesList)).flat();
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

    getWeeklyRewardsSplit(scAddress: string, startWeek: number, endWeek: number): GlobalInfoByWeekModel[] {
        const modelsList = []
        for (let week = startWeek; week <= endWeek; week++) {
            modelsList.push(this.weeklyRewardsSplittingService.getGlobalInfoByWeek(scAddress, week))
        }
        return modelsList;
    }

    getUserWeeklyRewardsSplit(scAddress: string, userAddress: string, startWeek: number, endWeek: number): UserInfoByWeekModel[] {
        const modelsList = []
        for (let week = startWeek; week <= endWeek; week++) {
            modelsList.push(this.weeklyRewardsSplittingService.getUserInfoByWeek(scAddress, userAddress, week))
        }
        return modelsList;
    }
}
