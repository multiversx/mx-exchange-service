import { Injectable } from '@nestjs/common';
import { FeesCollectorModel } from 'src/modules/fees-collector/models/fees-collector.model';
import {
    computeDistribution,
    refreshWeekStartAndEndEpochs,
} from '../../utils/rewards.compute.utils';
import { StateStore } from '../state.store';
import { constantsConfig } from 'src/config';

@Injectable()
export class FeesCollectorComputeService {
    constructor(private readonly stateStore: StateStore) {}

    computeMissingFeesCollectorFields(
        feesCollector: FeesCollectorModel,
    ): FeesCollectorModel {
        refreshWeekStartAndEndEpochs(feesCollector.time);

        feesCollector.startWeek =
            feesCollector.time.currentWeek -
            constantsConfig.USER_MAX_CLAIM_WEEKS;
        feesCollector.endWeek = feesCollector.time.currentWeek;

        feesCollector.undistributedRewards.forEach((globalInfo) => {
            if (!globalInfo.totalRewardsForWeek) {
                globalInfo.totalRewardsForWeek = [];
            }

            globalInfo.rewardsDistributionForWeek = computeDistribution(
                globalInfo.totalRewardsForWeek,
                this.stateStore.tokens,
                this.stateStore.lockedTokenCollection,
            );
            globalInfo.apr = '0';
        });

        return feesCollector;
    }
}
