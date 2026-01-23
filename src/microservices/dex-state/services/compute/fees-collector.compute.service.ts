import { Injectable } from '@nestjs/common';
import { FeesCollectorModel } from 'src/modules/fees-collector/models/fees-collector.model';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import {
    computeDistribution,
    refreshWeekStartAndEndEpochs,
} from '../../utils/rewards.compute.utils';

@Injectable()
export class FeesCollectorComputeService {
    computeMissingFeesCollectorFields(
        feesCollector: FeesCollectorModel,
        tokens: Map<string, EsdtToken>,
    ): FeesCollectorModel {
        refreshWeekStartAndEndEpochs(feesCollector.time);

        feesCollector.undistributedRewards.forEach((globalInfo) => {
            if (!globalInfo.totalRewardsForWeek) {
                globalInfo.totalRewardsForWeek = [];
            }
            globalInfo.rewardsDistributionForWeek = computeDistribution(
                globalInfo.totalRewardsForWeek,
                tokens,
            );
            globalInfo.apr = '0';
        });

        return feesCollector;
    }
}
