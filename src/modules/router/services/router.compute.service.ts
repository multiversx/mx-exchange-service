import { forwardRef, Inject, Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { awsConfig, elrondData } from 'src/config';
import { AWSTimestreamQueryService } from 'src/services/aws/aws.timestream.query';
import { ElrondDataService } from 'src/services/elrond-communication/services/elrond-data.service';
import { PairComputeService } from '../../pair/services/pair.compute.service';
import { RouterGetterService } from './router.getter.service';

@Injectable()
export class RouterComputeService {
    constructor(
        @Inject(forwardRef(() => RouterGetterService))
        private readonly routerGetterService: RouterGetterService,
        private readonly pairComputeService: PairComputeService,
        private readonly awsTimestreamQuery: AWSTimestreamQueryService,
        private readonly elrondDataService: ElrondDataService,
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

    async computeTotalVolumeUSD(startTimeUtc: string): Promise<BigNumber> {
        const pairsAddress = await this.routerGetterService.getAllPairsAddress();
        let totalVolumeUSD = new BigNumber(0);

        const promises = pairsAddress.map(pairAddress =>
            // this.awsTimestreamQuery.getAggregatedValue({
            //     table: awsConfig.timestream.tableName,
            //     series: pairAddress,
            //     metric: 'volumeUSD',
            //     time,
            // }),
            this.elrondDataService.getAggregatedValue({
                table: elrondData.timescale.table,
                series: pairAddress,
                key: 'volumeUSD',
                startTimeUtc,
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

    async computeTotalFeesUSD(startTimeUtc: string): Promise<BigNumber> {
        const pairsAddress = await this.routerGetterService.getAllPairsAddress();
        let totalFeesUSD = new BigNumber(0);

        const promises = pairsAddress.map(pairAddress =>
            // this.awsTimestreamQuery.getAggregatedValue({
            //     table: awsConfig.timestream.tableName,
            //     series: pairAddress,
            //     metric: 'feesUSD',
            //     time,
            // }),
            this.elrondDataService.getAggregatedValue({
                table: elrondData.timescale.table,
                series: pairAddress,
                key: 'feesUSD',
                startTimeUtc,
            }),
        );

        const feesUSD = await Promise.all(promises);
        for (const feeUSD of feesUSD) {
            totalFeesUSD = totalFeesUSD.plus(feeUSD);
        }

        return totalFeesUSD;
    }
}
