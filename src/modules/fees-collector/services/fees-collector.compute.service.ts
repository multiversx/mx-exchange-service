import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { FeesCollectorGetterService } from './fees-collector.getter.service';
import {
    WeekTimekeepingGetterService
} from '../../../submodules/week-timekeeping/services/week-timekeeping.getter.service';
import { ContextGetterService } from '../../../services/context/context.getter.service';
import { BigNumber } from 'bignumber.js';

@Injectable()
export class FeesCollectorComputeService {
    constructor(
        @Inject(forwardRef(() => FeesCollectorGetterService))
        protected readonly feesCollectorGetter: FeesCollectorGetterService,
        private readonly weekTimekeepingGetter: WeekTimekeepingGetterService,
        private readonly contextGetter: ContextGetterService,
    ) {
    }

    async computeAccumulatedFeesUntilNow(scAddress: string, week: number): Promise<string> {
        const [
            startEpochForCurrentWeek,
            currentEpoch,
            lockedTokensPerBlock
        ] = await Promise.all([
            this.weekTimekeepingGetter.getStartEpochForWeek(scAddress, week),
            this.contextGetter.getCurrentEpoch(),
            this.feesCollectorGetter.getLockedTokensPerBlock(scAddress),
        ]);
        const promises = []
        for (let epoch = startEpochForCurrentWeek; epoch <= currentEpoch; epoch++) {
            promises.push(this.contextGetter.getBlocksCountInEpoch(epoch));
        }
        const blocksInEpoch = await Promise.all(promises);

        let blocksInWeek = 0;
        for (const blocks of blocksInEpoch) {
            blocksInWeek += blocks;
        }

        return new BigNumber(lockedTokensPerBlock)
            .multipliedBy(blocksInWeek)
            .toFixed();
    }
}
