import { Inject, Injectable } from '@nestjs/common';
import { PerformanceProfiler } from '@multiversx/sdk-nestjs-monitoring';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import BigNumber from 'bignumber.js';
import { constantsConfig, scAddress } from 'src/config';
import { FeesCollectorModel } from 'src/modules/fees-collector/models/fees-collector.model';
import { FeesCollectorAbiService } from 'src/modules/fees-collector/services/fees-collector.abi.service';
import { EnergyAbiService } from 'src/modules/energy/services/energy.abi.service';
import { WeekTimekeepingAbiService } from 'src/submodules/week-timekeeping/services/week-timekeeping.abi.service';
import { WeekTimekeepingModel } from 'src/submodules/week-timekeeping/models/week-timekeeping.model';
import { WeeklyRewardsSplittingAbiService } from 'src/submodules/weekly-rewards-splitting/services/weekly-rewards-splitting.abi.service';
import { EsdtTokenPayment } from 'src/models/esdtTokenPayment.model';
import { MXApiService } from 'src/services/multiversx-communication/mx.api.service';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { WeeklyRewardsSyncService } from './weekly-rewards.sync.service';

@Injectable()
export class FeesCollectorSyncService {
    constructor(
        private readonly feesCollectorAbi: FeesCollectorAbiService,
        private readonly energyAbi: EnergyAbiService,
        private readonly weekTimekeepingAbi: WeekTimekeepingAbiService,
        private readonly weeklyRewardsSplittingAbi: WeeklyRewardsSplittingAbiService,
        private readonly apiService: MXApiService,
        private readonly contextGetter: ContextGetterService,
        private readonly weeklyRewardsUtils: WeeklyRewardsSyncService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async populateFeesCollector(): Promise<FeesCollectorModel> {
        const profiler = new PerformanceProfiler();

        const address = scAddress.feesCollector;

        const [
            allTokens,
            knownContracts,
            lockedTokensPerEpoch,
            lastLockedTokensAddWeek,
            lockedTokenId,
            currentWeek,
            firstWeekStartEpoch,
            lastGlobalUpdateWeek,
            stats,
            currentEpoch,
        ] = await Promise.all([
            this.feesCollectorAbi.getAllTokensRaw(),
            this.feesCollectorAbi.getKnownContractsRaw(),
            this.feesCollectorAbi.getLockedTokensPerEpochRaw(),
            this.feesCollectorAbi.getLastLockedTokensAddWeekRaw(),
            this.energyAbi.lockedTokenID(),
            this.weekTimekeepingAbi.getCurrentWeekRaw(address),
            this.weekTimekeepingAbi.firstWeekStartEpochRaw(address),
            this.weeklyRewardsSplittingAbi.lastGlobalUpdateWeekRaw(address),
            this.apiService.getStats(),
            this.contextGetter.getCurrentEpoch(),
        ]);

        const startEpochForWeek =
            firstWeekStartEpoch +
            (currentWeek - 1) * constantsConfig.EPOCHS_IN_WEEK;
        const endEpochForWeek =
            startEpochForWeek + constantsConfig.EPOCHS_IN_WEEK - 1;

        const time = new WeekTimekeepingModel({
            currentWeek,
            firstWeekStartEpoch,
            startEpochForWeek,
            endEpochForWeek,
        });

        const [
            undistributedRewards,
            blocksInWeek,
            accumulatedFees,
            rewardsClaimed,
        ] = await Promise.all([
            this.weeklyRewardsUtils.getGlobalInfoWeeklyModels(
                address,
                currentWeek,
            ),
            this.getBlocksInWeek(currentEpoch, time),
            this.getFeesCollectorAccumulatedFees(currentWeek, allTokens),
            this.getFeesCollectorRewardsClaimed(currentWeek, allTokens),
        ]);

        const lockedTokensPerBlock = new BigNumber(lockedTokensPerEpoch)
            .dividedBy(stats.roundsPerEpoch)
            .integerValue()
            .toFixed();

        const accumulatedFeesUntilNow = new BigNumber(lockedTokensPerBlock)
            .multipliedBy(blocksInWeek)
            .toFixed();

        accumulatedFees.push(
            new EsdtTokenPayment({
                tokenID: `Minted${lockedTokenId}`,
                tokenType: 0,
                amount: accumulatedFeesUntilNow,
                nonce: 0,
            }),
        );

        const feesCollector = new FeesCollectorModel({
            address,
            time,
            startWeek: currentWeek - constantsConfig.USER_MAX_CLAIM_WEEKS,
            endWeek: currentWeek,
            lastGlobalUpdateWeek,
            undistributedRewards,
            allTokens,
            knownContracts,
            accumulatedFees,
            rewardsClaimed,
            lockedTokenId,
            lockedTokensPerBlock,
            lockedTokensPerEpoch,
            lastLockedTokensAddWeek,
        });

        profiler.stop();
        this.logger.debug(
            `${this.populateFeesCollector.name} : ${profiler.duration}ms`,
            {
                context: FeesCollectorSyncService.name,
            },
        );

        return feesCollector;
    }

    private async getFeesCollectorRewardsClaimed(
        week: number,
        allTokens: string[],
    ): Promise<EsdtTokenPayment[]> {
        const claimAmounts = await Promise.all(
            allTokens.map((token) =>
                this.feesCollectorAbi.getRewardsClaimedRaw(week, token),
            ),
        );

        return allTokens.map(
            (token, index) =>
                new EsdtTokenPayment({
                    tokenID: token,
                    tokenType: 0,
                    amount: claimAmounts[index],
                    nonce: 0,
                }),
        );
    }

    private async getFeesCollectorAccumulatedFees(
        week: number,
        allTokens: string[],
    ): Promise<EsdtTokenPayment[]> {
        const accumulatedFeesByToken = await Promise.all(
            allTokens.map((token) =>
                this.feesCollectorAbi.getAccumulatedFeesRaw(week, token),
            ),
        );

        return accumulatedFeesByToken.map(
            (accumulatedFee, index) =>
                new EsdtTokenPayment({
                    tokenID: allTokens[index],
                    tokenType: 0,
                    amount: accumulatedFee,
                    nonce: 0,
                }),
        );
    }

    private async getBlocksInWeek(
        currentEpoch: number,
        time: WeekTimekeepingModel,
    ): Promise<number> {
        const promises = [];
        for (
            let epoch = time.startEpochForWeek;
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
