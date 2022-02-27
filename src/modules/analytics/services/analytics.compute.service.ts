import { Injectable } from '@nestjs/common';
import { BigNumber } from 'bignumber.js';
import {
    FarmRewardType,
    FarmVersion,
} from 'src/modules/farm/models/farm.model';
import { FarmComputeService } from 'src/modules/farm/services/farm.compute.service';
import { FarmGetterService } from 'src/modules/farm/services/farm.getter.service';
import { LockedAssetGetterService } from 'src/modules/locked-asset-factory/services/locked.asset.getter.service';
import { PairComputeService } from 'src/modules/pair/services/pair.compute.service';
import { PairGetterService } from 'src/modules/pair/services/pair.getter.service';
import { ContextService } from 'src/services/context/context.service';
import { farmsAddresses, farmType, farmVersion } from 'src/utils/farm.utils';

@Injectable()
export class AnalyticsComputeService {
    constructor(
        private readonly context: ContextService,
        private readonly farmGetterService: FarmGetterService,
        private readonly farmComputeService: FarmComputeService,
        private readonly pairCompute: PairComputeService,
        private readonly pairGetterService: PairGetterService,
        private readonly lockedAssetGetter: LockedAssetGetterService,
    ) {}

    async computeLockedValueUSDFarms(): Promise<string> {
        let totalLockedValue = new BigNumber(0);

        const promises: Promise<string>[] = farmsAddresses().map(farmAddress =>
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
        const pairsAddress = await this.context.getAllPairsAddress();
        const filteredPairs = await this.fiterPairsByIssuedLpToken(
            pairsAddress,
        );

        let totalValueLockedUSD = new BigNumber(0);
        const promises = filteredPairs.map(pairAddress =>
            this.pairGetterService.getLockedValueUSD(pairAddress),
        );

        if (farmsAddresses()[5] !== undefined) {
            promises.push(
                this.farmComputeService.computeFarmLockedValueUSD(
                    farmsAddresses()[5],
                ),
            );
        }
        if (farmsAddresses()[9] !== undefined) {
            promises.push(
                this.farmComputeService.computeFarmLockedValueUSD(
                    farmsAddresses()[9],
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
        const promises = addresses.map(async farmAddress => {
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
            totalAggregatedRewards = totalAggregatedRewards.plus(
                aggregatedRewards,
            );
        }
        return totalAggregatedRewards.toFixed();
    }

    async computeTotalBurnedTokenAmount(tokenID: string): Promise<string> {
        const promises = [];
        const pairsAddresses = await this.context.getAllPairsAddress();
        for (const pairAddress of pairsAddresses) {
            promises.push(
                this.pairGetterService.getBurnedTokenAmount(
                    pairAddress,
                    tokenID,
                ),
            );
        }
        for (const farmAddress of farmsAddresses()) {
            promises.push(
                this.farmGetterService.getBurnedTokenAmount(
                    farmAddress,
                    tokenID,
                ),
            );
        }
        promises.push(this.lockedAssetGetter.getBurnedTokenAmount(tokenID));

        const burnedTokenAmounts = await Promise.all(promises);
        let burnedTokenAmount = new BigNumber(0);
        for (const burnedToken of burnedTokenAmounts) {
            burnedTokenAmount = burnedTokenAmount.plus(burnedToken);
        }

        return burnedTokenAmount.toFixed();
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
