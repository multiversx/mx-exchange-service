import { Injectable } from '@nestjs/common';
import { FeesCollectorModel } from 'src/modules/fees-collector/models/fees-collector.model';
import {
    computeDistribution,
    refreshWeekStartAndEndEpochs,
} from '../../utils/rewards.compute.utils';
import { StateStore } from '../state.store';

@Injectable()
export class FeesCollectorComputeService {
    computeMissingFeesCollectorFields(
        feesCollector: FeesCollectorModel,
        stateStore: StateStore,
    ): FeesCollectorModel {
        refreshWeekStartAndEndEpochs(feesCollector.time);

        feesCollector.undistributedRewards.forEach((globalInfo) => {
            if (!globalInfo.totalRewardsForWeek) {
                globalInfo.totalRewardsForWeek = [];
            }

            globalInfo.rewardsDistributionForWeek = computeDistribution(
                globalInfo.totalRewardsForWeek,
                stateStore,
            );
            globalInfo.apr = '0';
        });

        return feesCollector;
    }
}
