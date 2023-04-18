import { Injectable } from '@nestjs/common';
import {
    FeesCollectorModel,
    FeesCollectorTransactionModel,
    UserEntryFeesCollectorModel,
} from '../models/fees-collector.model';
import { FeesCollectorGetterService } from './fees-collector.getter.service';
import { EsdtTokenPayment } from '../../../models/esdtTokenPayment.model';
import {
    GlobalInfoByWeekModel,
    UserInfoByWeekModel,
} from '../../../submodules/weekly-rewards-splitting/models/weekly-rewards-splitting.model';
import { TransactionModel } from '../../../models/transaction.model';
import { constantsConfig, mxConfig, gasConfig } from '../../../config';
import { MXProxyService } from '../../../services/multiversx-communication/mx.proxy.service';
import { Address, AddressValue } from '@multiversx/sdk-core';
import BigNumber from 'bignumber.js';
import { WeekTimekeepingModel } from 'src/submodules/week-timekeeping/models/week-timekeeping.model';
import { WeekTimekeepingAbiService } from 'src/submodules/week-timekeeping/services/week-timekeeping.abi.service';
import { WeeklyRewardsSplittingAbiService } from 'src/submodules/weekly-rewards-splitting/services/weekly-rewards-splitting.abi.service';

@Injectable()
export class FeesCollectorService {
    constructor(
        private readonly feesCollectorGetter: FeesCollectorGetterService,
        private readonly weekTimekeepingAbi: WeekTimekeepingAbiService,
        private readonly weeklyRewardsSplittingAbi: WeeklyRewardsSplittingAbiService,
        private readonly mxProxy: MXProxyService,
    ) {}

    async claimRewardsBatch(
        scAddress: string,
        userAddress: string,
    ): Promise<FeesCollectorTransactionModel> {
        const currentWeek = await this.weekTimekeepingAbi.currentWeek(
            scAddress,
        );
        const lastActiveWeekForUser =
            await this.weeklyRewardsSplittingAbi.lastActiveWeekForUser(
                scAddress,
                userAddress,
            );
        const weekToClaim = Math.min(
            constantsConfig.USER_MAX_CLAIM_WEEKS,
            currentWeek - lastActiveWeekForUser,
        );
        const transaction = await this.claimRewards(
            userAddress,
            weekToClaim * gasConfig.feesCollector.claimRewardsPerWeek +
                gasConfig.feesCollector.baseClaimRewards,
        );
        const claimTransaction = new FeesCollectorTransactionModel({
            transaction: transaction,
            count: 0,
        });
        if (lastActiveWeekForUser === 0) return claimTransaction;
        if (lastActiveWeekForUser >= currentWeek) return claimTransaction;

        claimTransaction.count = 1;
        return claimTransaction;
    }

    async claimRewards(
        sender: string,
        gasLimit: number,
    ): Promise<TransactionModel> {
        const contract = await this.mxProxy.getFeesCollectorContract();
        return contract.methodsExplicit
            .claimRewards()
            .withGasLimit(gasLimit)
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async getAccumulatedFees(
        scAddress: string,
        week: number,
        allTokens: string[],
    ): Promise<EsdtTokenPayment[]> {
        const accumulatedFees: EsdtTokenPayment[] = [];

        const promises = allTokens.map((token) =>
            this.feesCollectorGetter.getAccumulatedFees(scAddress, week, token),
        );

        const accumulatedFeesByToken = await Promise.all(promises);
        for (const index in accumulatedFeesByToken) {
            accumulatedFees.push(
                new EsdtTokenPayment({
                    tokenID: allTokens[index],
                    tokenType: 0,
                    amount: accumulatedFeesByToken[index],
                    nonce: 0,
                }),
            );
        }

        const [lockedTokenId, accumulatedTokenForInflation] = await Promise.all(
            [
                this.feesCollectorGetter.getLockedTokenId(scAddress),
                this.feesCollectorGetter.getAccumulatedTokenForInflation(
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
            this.feesCollectorGetter.getAllTokens(scAddress),
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

    async updateEnergyForUser(userAddress: string): Promise<TransactionModel> {
        const contract = await this.mxProxy.getFeesCollectorContract();
        return contract.methodsExplicit
            .updateEnergyForUser([
                new AddressValue(Address.fromString(userAddress)),
            ])
            .withGasLimit(gasConfig.feesCollector.updateEnergyForUser)
            .withChainID(mxConfig.chainID)
            .buildTransaction()
            .toPlainObject();
    }

    async getUserAccumulatedRewards(
        scAddress: string,
        userAddress: string,
        currentWeek: number,
    ): Promise<EsdtTokenPayment[]> {
        const allTokens = await this.feesCollectorGetter.getAllTokens(
            scAddress,
        );
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
