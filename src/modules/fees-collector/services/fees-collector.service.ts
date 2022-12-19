import { Injectable } from '@nestjs/common';
import {
    FeesCollectorModel,
    FeesCollectorTransactionModel,
    UserEntryFeesCollectorModel
} from '../models/fees-collector.model';
import { FeesCollectorGetterService } from './fees-collector.getter.service';
import { EsdtTokenPayment } from '../../../models/esdtTokenPayment.model';
import { WeekTimekeepingService } from '../../../submodules/week-timekeeping/services/week-timekeeping.service';
import {
    WeeklyRewardsSplittingService,
} from '../../../submodules/weekly-rewards-splitting/services/weekly-rewards-splitting.service';
import {
    ClaimProgress,
    GlobalInfoByWeekModel,
    UserInfoByWeekModel,
} from '../../../submodules/weekly-rewards-splitting/models/weekly-rewards-splitting.model';
import { TransactionModel } from '../../../models/transaction.model';
import {
    WeekTimekeepingGetterService,
} from '../../../submodules/week-timekeeping/services/week-timekeeping.getter.service';
import {
    WeeklyRewardsSplittingGetterService,
} from '../../../submodules/weekly-rewards-splitting/services/weekly-rewards-splitting.getter.service';
import { constantsConfig, elrondConfig, gasConfig } from '../../../config';
import { ElrondProxyService } from '../../../services/elrond-communication/elrond-proxy.service';
import { Address, AddressValue } from '@elrondnetwork/erdjs/out';
import BigNumber from 'bignumber.js';


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
    ): Promise<FeesCollectorTransactionModel> {
        const currentWeek = await this.weekTimekeepingGetter.getCurrentWeek(scAddress);
        const lastActiveWeekForUser = await this.weeklyRewardsSplittingGetter.lastActiveWeekForUser(scAddress, userAddress);
        const weekToClaim = Math.min(constantsConfig.USER_MAX_CLAIM_WEEKS, currentWeek - lastActiveWeekForUser)
        const transaction = await this.claimRewards(userAddress, weekToClaim *
            gasConfig.feesCollector.claimRewardsPerWeek + gasConfig.feesCollector.baseClaimRewards);
        const claimTransaction = new FeesCollectorTransactionModel(
            {
                transaction: transaction,
                count: 0
            }
        );
        if (lastActiveWeekForUser === 0) return claimTransaction;
        if (lastActiveWeekForUser >= currentWeek) return claimTransaction;

        claimTransaction.count = 1;
        return claimTransaction;
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

        const promises = allTokens.map( (token) => this.feesCollectorGetterService.getAccumulatedFees(scAddress, week, token))

        const accumulatedFeesByToken = await Promise.all(promises);
        for (const index in accumulatedFeesByToken) {
            accumulatedFees.push(new EsdtTokenPayment({
                tokenID: allTokens[index],
                tokenType: 0,
                amount: accumulatedFeesByToken[index],
                nonce: 0,
            }))
        }

        const [
            lockedTokenId,
            accumulatedTokenForInflation,
        ] = await Promise.all([
            this.feesCollectorGetterService.getLockedTokenId(scAddress),
            this.feesCollectorGetterService.getAccumulatedTokenForInflation(scAddress, week)
        ])
        accumulatedFees.push(new EsdtTokenPayment({
            tokenID: `Minted${lockedTokenId}`,
            tokenType: 0,
            amount: accumulatedTokenForInflation,
            nonce: 0,
        }));

        return accumulatedFees
    }

    async feesCollector(
        scAddress: string
    ): Promise<FeesCollectorModel> {

        const [
            time,
            allToken,
            currentWeek
        ] = await Promise.all([
            this.weekTimekeepingService.getWeeklyTimekeeping(scAddress),
            this.feesCollectorGetterService.getAllTokens(scAddress),
            this.weekTimekeepingGetter.getCurrentWeek(scAddress),
        ])
        const lastWeek = currentWeek - 1;
        return new FeesCollectorModel({
            address: scAddress,
            time: time,
            startWeek: currentWeek - constantsConfig.USER_MAX_CLAIM_WEEKS,
            endWeek: lastWeek,
            allTokens: allToken,
        });
    }

    async userFeesCollector(
        scAddress: string,
        userAddress: string,
    ): Promise<UserEntryFeesCollectorModel> {
        const [
            time,
            lastActiveWeekForUser,
            currentWeek
        ] = await Promise.all([
            this.weekTimekeepingService.getWeeklyTimekeeping(scAddress),
            this.weeklyRewardsSplittingGetter.lastActiveWeekForUser(scAddress, userAddress),
            this.weekTimekeepingGetter.getCurrentWeek(scAddress),
        ]);
        const lastWeek = currentWeek - 1;
        return new UserEntryFeesCollectorModel({
            address: scAddress,
            userAddress: userAddress,
            startWeek: lastActiveWeekForUser === 0 ? currentWeek : Math.max(currentWeek - constantsConfig.USER_MAX_CLAIM_WEEKS, lastActiveWeekForUser),
            endWeek: lastWeek,
            time: time,
        });
    }

    async getUserCurrentClaimProgress(scAddress: string, userAddress: string): Promise<ClaimProgress> {
        return await this.weeklyRewardsSplittingGetter.currentClaimProgress(scAddress, userAddress);
    }

    async getCurrentWeek(scAddress: string): Promise<number> {
        return await this.weekTimekeepingGetter.getCurrentWeek(scAddress);
    }

    getWeeklyRewardsSplit(scAddress: string, startWeek: number, endWeek: number): GlobalInfoByWeekModel[] {
        const modelsList = []
        for (let week = startWeek; week <= endWeek; week++) {
            if (week < 1) {
                continue;
            }
            modelsList.push(this.weeklyRewardsSplittingService.getGlobalInfoByWeek(scAddress, week))
        }
        return modelsList;
    }

    getUserWeeklyRewardsSplit(scAddress: string, userAddress: string, startWeek: number, endWeek: number): UserInfoByWeekModel[] {
        const modelsList = []
        for (let week = startWeek; week <= endWeek; week++) {
            if (week < 1) {
                continue;
            }
            modelsList.push(this.weeklyRewardsSplittingService.getUserInfoByWeek(scAddress, userAddress, week))
        }
        return modelsList;
    }

    async updateEnergyForUser(userAddress: string): Promise<TransactionModel> {
        const contract = await this.elrondProxy.getFeesCollectorContract();
        return contract.methodsExplicit
            .updateEnergyForUser(
                [new AddressValue(Address.fromString(userAddress))]
            )
            .withGasLimit(gasConfig.feesCollector.updateEnergyForUser)
            .withChainID(elrondConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async getUserAccumulatedRewards(scAddress: string, userAddress: string, currentWeek: number): Promise<EsdtTokenPayment[]> {
        const allTokens = await this.feesCollectorGetterService.getAllTokens(scAddress);
        const [
            accumulatedFees,
            totalEnergyForWeek,
            currentClaimProgress,
        ] = await Promise.all([
            this.getAccumulatedFees(scAddress, currentWeek, allTokens),
            this.weeklyRewardsSplittingGetter.totalEnergyForWeek(scAddress, currentWeek),
            this.weeklyRewardsSplittingGetter.currentClaimProgress(scAddress, userAddress)
        ]);

        if (currentClaimProgress.week === 0 ||
            new BigNumber(currentClaimProgress.energy.amount).isZero()) {
            return [];
        }

        const accumulatedRewards = [];
        const percentage = new BigNumber(currentClaimProgress.energy.amount)
            .dividedBy(totalEnergyForWeek);

        for (const payment of accumulatedFees) {
            accumulatedRewards.push(new EsdtTokenPayment({
                amount: new BigNumber(payment.amount).multipliedBy(percentage).integerValue().toFixed(),
                nonce: payment.nonce,
                tokenID: payment.tokenID,
                tokenType: payment.tokenType
            }))
        }
        return accumulatedRewards;
    }
}
