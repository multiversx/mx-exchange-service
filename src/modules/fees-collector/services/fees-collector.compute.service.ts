import { Injectable } from '@nestjs/common';
import { ContextGetterService } from '../../../services/context/context.getter.service';
import { BigNumber } from 'bignumber.js';
import { FeesCollectorAbiService } from './fees-collector.abi.service';
import { ErrorLoggerAsync } from 'src/helpers/decorators/error.logger';
import { GetOrSetCache } from 'src/helpers/decorators/caching.decorator';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';
import { WeekTimekeepingComputeService } from 'src/submodules/week-timekeeping/services/week-timekeeping.compute.service';
import { WeeklyRewardsSplittingAbiService } from 'src/submodules/weekly-rewards-splitting/services/weekly-rewards-splitting.abi.service';
import { EsdtTokenPayment } from 'src/models/esdtTokenPayment.model';
import { TokenDistributionModel } from 'src/submodules/weekly-rewards-splitting/models/weekly-rewards-splitting.model';
import { WeeklyRewardsSplittingComputeService } from 'src/submodules/weekly-rewards-splitting/services/weekly-rewards-splitting.compute.service';

@Injectable()
export class FeesCollectorComputeService {
    constructor(
        private readonly feesCollectorAbi: FeesCollectorAbiService,
        private readonly weekTimekeepingCompute: WeekTimekeepingComputeService,
        private readonly weeklyRewardsSplittingAbi: WeeklyRewardsSplittingAbiService,
        private readonly weeklyRewardsSplittingCompute: WeeklyRewardsSplittingComputeService,
        private readonly contextGetter: ContextGetterService,
    ) {}

    @ErrorLoggerAsync({
        className: FeesCollectorComputeService.name,
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'feesCollector',
        remoteTtl: CacheTtlInfo.ContractBalance.remoteTtl,
        localTtl: CacheTtlInfo.ContractBalance.localTtl,
    })
    async userRewardsForWeek(
        scAddress: string,
        userAddress: string,
        week: number,
    ): Promise<EsdtTokenPayment[]> {
        return await this.computeUserRewardsForWeek(
            scAddress,
            userAddress,
            week,
        );
    }

    async computeUserRewardsForWeek(
        scAddress: string,
        userAddress: string,
        week: number,
    ): Promise<EsdtTokenPayment[]> {
        const [totalRewardsForWeek, userEnergyForWeek, totalEnergyForWeek] =
            await Promise.all([
                this.weeklyRewardsSplittingAbi.totalRewardsForWeek(
                    scAddress,
                    week,
                ),
                this.weeklyRewardsSplittingAbi.userEnergyForWeek(
                    scAddress,
                    userAddress,
                    week,
                ),
                this.weeklyRewardsSplittingAbi.totalEnergyForWeek(
                    scAddress,
                    week,
                ),
            ]);

        const payments: EsdtTokenPayment[] = [];
        if (totalRewardsForWeek.length === 0) {
            return payments;
        }

        if (!new BigNumber(userEnergyForWeek.amount).isGreaterThan(0)) {
            return payments;
        }

        for (const weeklyRewards of totalRewardsForWeek) {
            const paymentAmount = new BigNumber(weeklyRewards.amount)
                .multipliedBy(new BigNumber(userEnergyForWeek.amount))
                .dividedBy(new BigNumber(totalEnergyForWeek));
            if (paymentAmount.isGreaterThan(0)) {
                payments.push(
                    new EsdtTokenPayment({
                        tokenID: weeklyRewards.tokenID,
                        nonce: 0,
                        amount: paymentAmount.integerValue().toFixed(),
                        tokenType: weeklyRewards.tokenType,
                    }),
                );
            }
        }

        return payments;
    }

    @ErrorLoggerAsync({
        className: FeesCollectorComputeService.name,
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'feesCollector',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async userRewardsDistributionForWeek(
        scAddress: string,
        userAddress: string,
        week: number,
    ): Promise<TokenDistributionModel[]> {
        return await this.computeUserRewardsDistributionForWeek(
            scAddress,
            userAddress,
            week,
        );
    }

    async computeUserRewardsDistributionForWeek(
        scAddress: string,
        userAddress: string,
        week: number,
    ): Promise<TokenDistributionModel[]> {
        const userRewardsForWeek = await this.userRewardsForWeek(
            scAddress,
            userAddress,
            week,
        );
        return await this.weeklyRewardsSplittingCompute.computeDistribution(
            userRewardsForWeek,
        );
    }

    @ErrorLoggerAsync({
        className: FeesCollectorComputeService.name,
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'feesCollector',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async totalRewardsDistributionForWeek(
        scAddress: string,
        week: number,
    ): Promise<TokenDistributionModel[]> {
        return await this.computeTotalRewardsDistributionForWeek(
            scAddress,
            week,
        );
    }

    async computeTotalRewardsDistributionForWeek(
        scAddress: string,
        week: number,
    ): Promise<TokenDistributionModel[]> {
        const totalRewardsForWeek =
            await this.weeklyRewardsSplittingAbi.totalRewardsForWeek(
                scAddress,
                week,
            );
        return await this.weeklyRewardsSplittingCompute.computeDistribution(
            totalRewardsForWeek,
        );
    }

    @ErrorLoggerAsync({
        className: FeesCollectorComputeService.name,
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'feesCollector',
        remoteTtl: CacheTtlInfo.ContractBalance.remoteTtl,
        localTtl: CacheTtlInfo.ContractBalance.localTtl,
    })
    async accumulatedFeesUntilNow(
        scAddress: string,
        week: number,
    ): Promise<string> {
        return await this.computeAccumulatedFeesUntilNow(scAddress, week);
    }

    async computeAccumulatedFeesUntilNow(
        scAddress: string,
        week: number,
    ): Promise<string> {
        const [lockedTokensPerBlock, blocksInWeek] = await Promise.all([
            this.feesCollectorAbi.lockedTokensPerBlock(),
            this.computeBlocksInWeek(scAddress, week),
        ]);

        return new BigNumber(lockedTokensPerBlock)
            .multipliedBy(blocksInWeek)
            .toFixed();
    }

    private async computeBlocksInWeek(
        scAddress: string,
        week: number,
    ): Promise<number> {
        const [startEpochForCurrentWeek, currentEpoch] = await Promise.all([
            this.weekTimekeepingCompute.startEpochForWeek(scAddress, week),
            this.contextGetter.getCurrentEpoch(),
        ]);

        const promises = [];
        for (
            let epoch = startEpochForCurrentWeek;
            epoch <= currentEpoch;
            epoch++
        ) {
            promises.push(this.contextGetter.getBlocksCountInEpoch(epoch, 1));
        }

        const blocksInEpoch = await Promise.all(promises);
        return blocksInEpoch.reduce((total, current) => {
            return total + current;
        });
    }
}
