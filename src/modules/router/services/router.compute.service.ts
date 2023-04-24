import { forwardRef, Inject, Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { MetricsService } from 'src/endpoints/metrics/metrics.service';
import { PairComputeService } from '../../pair/services/pair.compute.service';
import { RouterGetterService } from './router.getter.service';

@Injectable()
export class RouterComputeService {
    constructor(
        @Inject(forwardRef(() => RouterGetterService))
        private readonly routerGetterService: RouterGetterService,
        @Inject(forwardRef(() => PairComputeService))
        private readonly pairCompute: PairComputeService,
        private readonly metrics: MetricsService,
    ) {}

    async computeTotalLockedValueUSD(): Promise<BigNumber> {
        const pairsAddress =
            await this.routerGetterService.getAllPairsAddress();
        let totalValueLockedUSD = new BigNumber(0);
        const promises = pairsAddress.map((pairAddress) =>
            this.pairCompute.computeLockedValueUSD(pairAddress),
        );

        const pairsLockedValueUSD = await Promise.all(promises);

        for (const lockedValueUSD of pairsLockedValueUSD) {
            const lockedValueUSDBig = new BigNumber(lockedValueUSD);
            totalValueLockedUSD = !lockedValueUSDBig.isNaN()
                ? totalValueLockedUSD.plus(lockedValueUSD)
                : totalValueLockedUSD;
        }

        return totalValueLockedUSD;
    }

    async computeTotalVolumeUSD(time: string): Promise<BigNumber> {
        const pairsAddress =
            await this.routerGetterService.getAllPairsAddress();
        let totalVolumeUSD = new BigNumber(0);

        const promises = pairsAddress.map((pairAddress) =>
            this.pairCompute.volumeUSD(pairAddress, time),
        );

        const volumesUSD = await Promise.all(promises);
        for (const volumeUSD of volumesUSD) {
            totalVolumeUSD =
                volumeUSD !== 'NaN'
                    ? totalVolumeUSD.plus(volumeUSD)
                    : totalVolumeUSD;
        }

        return totalVolumeUSD;
    }

    async computeTotalFeesUSD(time: string): Promise<BigNumber> {
        const pairsAddress =
            await this.routerGetterService.getAllPairsAddress();
        let totalFeesUSD = new BigNumber(0);

        const promises = pairsAddress.map((pairAddress) =>
            this.pairCompute.feesUSD(pairAddress, time),
        );

        const feesUSD = await Promise.all(promises);
        for (const feeUSD of feesUSD) {
            totalFeesUSD = totalFeesUSD.plus(feeUSD);
        }

        return totalFeesUSD;
    }

    async computeTotalTxCount(): Promise<number> {
        let totalTxCount = 0;
        const addresses = await this.routerGetterService.getAllPairsAddress();

        const promises = addresses.map((address) =>
            this.metrics.computeTxCount(address),
        );
        const txCounts = await Promise.all(promises);

        txCounts.forEach((txCount) => (totalTxCount += txCount));
        return totalTxCount;
    }
}
