import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { FeesCollectorGetterService } from './fees-collector.getter.service';
import { ContextGetterService } from '../../../services/context/context.getter.service';
import { BigNumber } from 'bignumber.js';

@Injectable()
export class FeesCollectorComputeService {
    constructor(
        @Inject(forwardRef(() => FeesCollectorGetterService))
        protected readonly feesCollectorGetter: FeesCollectorGetterService,
        private readonly contextGetter: ContextGetterService,
    ) {}

    async computeAccumulatedFeesUntilNow(
        scAddress: string,
        week: number,
    ): Promise<string> {
        const [lockedTokensPerBlock, blocksInWeek] = await Promise.all([
            this.feesCollectorGetter.getLockedTokensPerBlock(scAddress),
            this.computeBlocksInWeek(scAddress, week),
        ]);

        return new BigNumber(lockedTokensPerBlock)
            .multipliedBy(blocksInWeek)
            .toFixed();
    }

    async computeBlocksInWeek(
        scAddress: string,
        week: number,
    ): Promise<number> {
        const [startEpochForCurrentWeek, currentEpoch] = await Promise.all([
            this.feesCollectorGetter.getStartEpochForWeek(scAddress, week),
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
