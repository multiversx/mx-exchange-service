import { forwardRef, Inject, Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { MetricsService } from 'src/endpoints/metrics/metrics.service';
import { PairGetterService } from 'src/modules/pair/services/pair.getter.service';
import { PairComputeService } from '../../pair/services/pair.compute.service';
import { RouterAbiService } from './router.abi.service';
import { ErrorLoggerAsync } from 'src/helpers/decorators/error.logger';
import { GetOrSetCache } from 'src/helpers/decorators/caching.decorator';
import { oneHour, oneMinute } from 'src/helpers/helpers';

@Injectable()
export class RouterComputeService {
    constructor(
        private readonly routerAbi: RouterAbiService,
        @Inject(forwardRef(() => PairComputeService))
        private readonly pairComputeService: PairComputeService,
        @Inject(forwardRef(() => PairGetterService))
        private readonly pairGetter: PairGetterService,
        private readonly metrics: MetricsService,
    ) {}

    @ErrorLoggerAsync({
        className: RouterComputeService.name,
    })
    @GetOrSetCache({
        baseKey: 'router',
        remoteTtl: oneMinute(),
    })
    async totalLockedValueUSD(): Promise<BigNumber> {
        return await this.computeTotalLockedValueUSD();
    }

    async computeTotalLockedValueUSD(): Promise<BigNumber> {
        const pairsAddress = await this.routerAbi.pairsAddress();
        let totalValueLockedUSD = new BigNumber(0);
        const promises = pairsAddress.map((pairAddress) =>
            this.pairComputeService.computeLockedValueUSD(pairAddress),
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

    @ErrorLoggerAsync({
        className: RouterComputeService.name,
    })
    @GetOrSetCache({
        baseKey: 'router',
        remoteTtl: oneMinute() * 5,
    })
    async totalVolumeUSD(time: string): Promise<BigNumber> {
        return await this.computeTotalVolumeUSD(time);
    }

    async computeTotalVolumeUSD(time: string): Promise<BigNumber> {
        const pairsAddress = await this.routerAbi.pairsAddress();
        let totalVolumeUSD = new BigNumber(0);

        const promises = pairsAddress.map((pairAddress) =>
            this.pairGetter.getVolumeUSD(pairAddress, time),
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

    @ErrorLoggerAsync({
        className: RouterComputeService.name,
    })
    @GetOrSetCache({
        baseKey: 'router',
        remoteTtl: oneMinute() * 5,
    })
    async totalFeesUSD(time: string): Promise<BigNumber> {
        return await this.computeTotalFeesUSD(time);
    }

    async computeTotalFeesUSD(time: string): Promise<BigNumber> {
        const pairsAddress = await this.routerAbi.pairsAddress();
        let totalFeesUSD = new BigNumber(0);

        const promises = pairsAddress.map((pairAddress) =>
            this.pairGetter.getFeesUSD(pairAddress, time),
        );

        const feesUSD = await Promise.all(promises);
        for (const feeUSD of feesUSD) {
            totalFeesUSD = totalFeesUSD.plus(feeUSD);
        }

        return totalFeesUSD;
    }

    @ErrorLoggerAsync({
        className: RouterComputeService.name,
    })
    @GetOrSetCache({
        baseKey: 'router',
        remoteTtl: oneMinute(),
    })
    async totalTxCount(): Promise<number> {
        return await this.computeTotalTxCount();
    }

    async computeTotalTxCount(): Promise<number> {
        let totalTxCount = 0;
        const addresses = await this.routerAbi.pairsAddress();

        const promises = addresses.map((address) =>
            this.metrics.computeTxCount(address),
        );
        const txCounts = await Promise.all(promises);

        txCounts.forEach((txCount) => (totalTxCount += txCount));
        return totalTxCount;
    }

    @ErrorLoggerAsync({
        className: RouterComputeService.name,
    })
    @GetOrSetCache({
        baseKey: 'router',
        remoteTtl: oneHour(),
    })
    async pairCount(): Promise<number> {
        return await this.computePairCount();
    }

    async computePairCount(): Promise<number> {
        return (await this.routerAbi.pairsAddress()).length;
    }
}
