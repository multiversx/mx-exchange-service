import { forwardRef, Inject, Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { PairComputeService } from '../../pair/services/pair.compute.service';
import { RouterAbiService } from './router.abi.service';
import { ErrorLoggerAsync } from '@multiversx/sdk-nestjs-common';
import { GetOrSetCache } from 'src/helpers/decorators/caching.decorator';
import { Constants } from '@multiversx/sdk-nestjs-common';
import { ESTransactionsService } from 'src/services/elastic-search/services/es.transactions.service';

@Injectable()
export class RouterComputeService {
    constructor(
        private readonly routerAbi: RouterAbiService,
        @Inject(forwardRef(() => PairComputeService))
        private readonly pairCompute: PairComputeService,
        private readonly metrics: ESTransactionsService,
    ) {}

    @ErrorLoggerAsync()
    @GetOrSetCache({
        baseKey: 'router',
        remoteTtl: Constants.oneMinute(),
    })
    async totalLockedValueUSD(): Promise<BigNumber> {
        return await this.computeTotalLockedValueUSD();
    }

    async computeTotalLockedValueUSD(): Promise<BigNumber> {
        const pairsAddress = await this.routerAbi.pairsAddress();
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

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'router',
        remoteTtl: Constants.oneMinute() * 5,
    })
    async totalVolumeUSD(time: string): Promise<BigNumber> {
        return await this.computeTotalVolumeUSD(time);
    }

    async computeTotalVolumeUSD(time: string): Promise<BigNumber> {
        const pairsAddress = await this.routerAbi.pairsAddress();
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

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'router',
        remoteTtl: Constants.oneMinute() * 5,
    })
    async totalFeesUSD(time: string): Promise<BigNumber> {
        return await this.computeTotalFeesUSD(time);
    }

    async computeTotalFeesUSD(time: string): Promise<BigNumber> {
        const pairsAddress = await this.routerAbi.pairsAddress();
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

    @ErrorLoggerAsync()
    @GetOrSetCache({
        baseKey: 'router',
        remoteTtl: Constants.oneMinute(),
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

    @ErrorLoggerAsync()
    @GetOrSetCache({
        baseKey: 'router',
        remoteTtl: Constants.oneHour(),
    })
    async pairCount(): Promise<number> {
        return await this.computePairCount();
    }

    async computePairCount(): Promise<number> {
        return (await this.routerAbi.pairsAddress()).length;
    }
}
