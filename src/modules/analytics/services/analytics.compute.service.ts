import { Injectable } from '@nestjs/common';
import { BigNumber } from 'bignumber.js';
import { awsConfig } from 'src/config';
import {
    FarmRewardType,
    FarmVersion,
} from 'src/modules/farm/models/farm.model';
import { FarmComputeService } from 'src/modules/farm/services/farm.compute.service';
import { FarmGetterService } from 'src/modules/farm/services/farm.getter.service';
import { PairGetterService } from 'src/modules/pair/services/pair.getter.service';
import { RouterGetterService } from 'src/modules/router/services/router.getter.service';
import { AWSTimestreamQueryService } from 'src/services/aws/aws.timestream.query';
import { ElrondDataApiReadService } from 'src/services/elrond-communication/elrond-data-api.read.service';
import { farmsAddresses, farmType, farmVersion } from 'src/utils/farm.utils';

@Injectable()
export class AnalyticsComputeService {
    constructor(
        private readonly routerGetter: RouterGetterService,
        private readonly farmGetterService: FarmGetterService,
        private readonly farmComputeService: FarmComputeService,
        private readonly pairGetterService: PairGetterService,
        private readonly awsTimestreamQuery: AWSTimestreamQueryService,
        private readonly elrondDataReadService: ElrondDataReadService,
    ) {}

    async computeLockedValueUSDFarms(): Promise<string> {
        let totalLockedValue = new BigNumber(0);

        const promises: Promise<string>[] = farmsAddresses().map(
            (farmAddress) =>
                this.farmComputeService.computeFarmLockedValueUSD(farmAddress),
        );
        const farmsLockedValueUSD = await Promise.all(promises);
        for (const farmLockedValueUSD of farmsLockedValueUSD) {
            const farmLockedValueUSDBig = new BigNumber(farmLockedValueUSD);
            totalLockedValue = !farmLockedValueUSDBig.isNaN()
                ? totalLockedValue.plus(farmLockedValueUSD)
                : totalLockedValue;
        }

        return totalLockedValue.toFixed();
    }

    async computeTotalValueLockedUSD(): Promise<string> {
        const pairsAddress = await this.routerGetter.getAllPairsAddress();
        const filteredPairs = await this.fiterPairsByIssuedLpToken(
            pairsAddress,
        );

        let totalValueLockedUSD = new BigNumber(0);
        const promises = filteredPairs.map((pairAddress) =>
            this.pairGetterService.getLockedValueUSD(pairAddress),
        );

        if (farmsAddresses()[5] !== undefined) {
            promises.push(
                this.farmComputeService.computeFarmLockedValueUSD(
                    farmsAddresses()[5],
                ),
            );
        }
        if (farmsAddresses()[12] !== undefined) {
            promises.push(
                this.farmComputeService.computeFarmLockedValueUSD(
                    farmsAddresses()[12],
                ),
            );
        }

        const lockedValuesUSD = await Promise.all([...promises]);

        for (const lockedValueUSD of lockedValuesUSD) {
            const lockedValuesUSDBig = new BigNumber(lockedValueUSD);
            totalValueLockedUSD = !lockedValuesUSDBig.isNaN()
                ? totalValueLockedUSD.plus(lockedValuesUSDBig)
                : totalValueLockedUSD;
        }

        return totalValueLockedUSD.toFixed();
    }

    async computeTotalAggregatedRewards(days: number): Promise<string> {
        const addresses: string[] = farmsAddresses();
        const promises = addresses.map(async (farmAddress) => {
            if (
                farmType(farmAddress) === FarmRewardType.CUSTOM_REWARDS ||
                farmVersion(farmAddress) === FarmVersion.V1_2
            ) {
                return '0';
            }
            return this.farmGetterService.getRewardsPerBlock(farmAddress);
        });
        const farmsRewardsPerBlock = await Promise.all(promises);
        const blocksNumber = (days * 24 * 60 * 60) / 6;

        let totalAggregatedRewards = new BigNumber(0);
        for (const rewardsPerBlock of farmsRewardsPerBlock) {
            const aggregatedRewards = new BigNumber(
                rewardsPerBlock,
            ).multipliedBy(blocksNumber);
            totalAggregatedRewards =
                totalAggregatedRewards.plus(aggregatedRewards);
        }
        return totalAggregatedRewards.toFixed();
    }

    async computeTokenBurned(
        tokenID: string,
        start: string,
        key: string,
    ): Promise<string> {
        return (await this.elrondDataReadService.isReadActive())
            ? await this.elrondDataReadService.getAggregatedValue({
                  series: tokenID,
                  key,
                  start,
              })
            : await this.awsTimestreamQuery.getAggregatedValue({
                  table: awsConfig.timestream.tableName,
                  series: tokenID,
                  metric: key,
                  time: start,
              });
    }

    private async fiterPairsByIssuedLpToken(
        pairsAddress: string[],
    ): Promise<string[]> {
        const filteredPairs = [];
        for (const pairAddress of pairsAddress) {
            const lpTokenID = await this.pairGetterService.getLpTokenID(
                pairAddress,
            );
            if (lpTokenID !== undefined) {
                filteredPairs.push(pairAddress);
            }
        }

        return filteredPairs;
    }
}
