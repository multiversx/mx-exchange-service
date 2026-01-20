import { Inject, Injectable } from '@nestjs/common';
import { PerformanceProfiler } from '@multiversx/sdk-nestjs-monitoring';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import BigNumber from 'bignumber.js';
import { constantsConfig, scAddress } from 'src/config';
import { FeesCollectorModel } from 'src/modules/fees-collector/models/fees-collector.model';
import { FeesCollectorAbiService } from 'src/modules/fees-collector/services/fees-collector.abi.service';
import { EnergyAbiService } from 'src/modules/energy/services/energy.abi.service';
import { EsdtTokenPayment } from 'src/models/esdtTokenPayment.model';
import { MXApiService } from 'src/services/multiversx-communication/mx.api.service';
import { ContextGetterService } from 'src/services/context/context.getter.service';
import { WeeklyRewardsSyncService } from './weekly-rewards.sync.service';
import { WeekTimekeepingModel } from 'src/submodules/week-timekeeping/models/week-timekeeping.model';

@Injectable()
export class FeesCollectorSyncService {
    constructor(
        private readonly feesCollectorAbi: FeesCollectorAbiService,
        private readonly energyAbi: EnergyAbiService,
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
            lockedTokenId,
            time,
        ] = await Promise.all([
            this.feesCollectorAbi.getAllTokensRaw(),
            this.feesCollectorAbi.getKnownContractsRaw(),
            this.feesCollectorAbi.getLockedTokensPerEpochRaw(),
            this.energyAbi.lockedTokenID(),
            this.weeklyRewardsUtils.getWeekTimekeeping(address),
        ]);

        const rewardsAndFees = await this.getRewardsAndFees(
            address,
            time,
            allTokens,
            lockedTokenId,
            lockedTokensPerEpoch,
        );

        const feesCollector = new FeesCollectorModel({
            address,
            time,
            startWeek: time.currentWeek - constantsConfig.USER_MAX_CLAIM_WEEKS,
            endWeek: time.currentWeek,
            allTokens,
            knownContracts,
            lockedTokenId,
            lockedTokensPerEpoch,
            ...rewardsAndFees,
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

    async getRewardsAndFees(
        address: string,
        time: WeekTimekeepingModel,
        allTokens: string[],
        lockedTokenId: string,
        lockedTokensPerEpoch: string,
    ): Promise<Partial<FeesCollectorModel>> {
        const currentEpoch = await this.contextGetter.getCurrentEpoch();

        const [
            lastLockedTokensAddWeek,
            lastGlobalUpdateWeek,
            undistributedRewards,
            blocksInWeek,
            accumulatedFees,
            rewardsClaimed,
            stats,
        ] = await Promise.all([
            this.feesCollectorAbi.getLastLockedTokensAddWeekRaw(),
            this.weeklyRewardsUtils.getLastGlobalUpdateWeek(address),
            this.weeklyRewardsUtils.getGlobalInfoWeeklyModels(
                address,
                time.currentWeek,
            ),
            this.getBlocksInWeek(currentEpoch, time.startEpochForWeek),
            this.getFeesCollectorAccumulatedFees(time.currentWeek, allTokens),
            this.getFeesCollectorRewardsClaimed(time.currentWeek, allTokens),
            this.apiService.getStats(),
        ]);

        const lockedTokensPerBlock = new BigNumber(lockedTokensPerEpoch)
            .dividedBy(stats.roundsPerEpoch)
            .integerValue();

        const accumulatedFeesUntilNow = lockedTokensPerBlock
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

        const feesCollectorUpdates: Partial<FeesCollectorModel> = {
            lockedTokensPerBlock: lockedTokensPerBlock.toFixed(),
            lastGlobalUpdateWeek,
            undistributedRewards,
            accumulatedFees,
            lastLockedTokensAddWeek,
            rewardsClaimed,
        };

        return feesCollectorUpdates;
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
        startEpochForWeek: number,
    ): Promise<number> {
        const promises = [];
        for (let epoch = startEpochForWeek; epoch <= currentEpoch; epoch++) {
            promises.push(this.contextGetter.getBlocksCountInEpoch(epoch, 1));
        }

        const blocksInEpoch = await Promise.all(promises);

        return blocksInEpoch.reduce((total, current) => {
            return total + current;
        });
    }
}
