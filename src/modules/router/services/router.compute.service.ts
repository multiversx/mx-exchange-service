import { forwardRef, Inject, Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { awsConfig } from 'src/config';
import { AWSTimestreamQueryService } from 'src/services/aws/aws.timestream.query';
import { PairComputeService } from '../../pair/services/pair.compute.service';
import { RouterGetterService } from './router.getter.service';

@Injectable()
export class RouterComputeService {
    constructor(
        @Inject(forwardRef(() => RouterGetterService))
        private readonly routerGetterService: RouterGetterService,
        private readonly pairComputeService: PairComputeService,
        private readonly awsTimestreamQuery: AWSTimestreamQueryService,
    ) {}

    async computeTotalLockedValueUSD(): Promise<BigNumber> {
        const pairsAddress = await this.routerGetterService.getAllPairsAddress();
        let totalValueLockedUSD = new BigNumber(0);
        const promises = pairsAddress.map(pairAddress =>
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

    async computeTotalVolumeUSD(time: string): Promise<BigNumber> {
        const pairsAddress = await this.routerGetterService.getAllPairsAddress();
        let totalVolumeUSD = new BigNumber(0);

        const promises = pairsAddress.map(pairAddress =>
            this.awsTimestreamQuery.getAggregatedValue({
                table: awsConfig.timestream.tableName,
                series: pairAddress,
                metric: 'volumeUSD',
                time,
            }),
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
        const pairsAddress = await this.routerGetterService.getAllPairsAddress();
        let totalFeesUSD = new BigNumber(0);

        const promises = pairsAddress.map(pairAddress =>
            this.awsTimestreamQuery.getAggregatedValue({
                table: awsConfig.timestream.tableName,
                series: pairAddress,
                metric: 'feesUSD',
                time,
            }),
        );

        const feesUSD = await Promise.all(promises);
        for (const feeUSD of feesUSD) {
            totalFeesUSD = totalFeesUSD.plus(feeUSD);
        }

        return totalFeesUSD;
    }
}
