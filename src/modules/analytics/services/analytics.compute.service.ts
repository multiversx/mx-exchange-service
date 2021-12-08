import { Injectable } from '@nestjs/common';
import { BigNumber } from 'bignumber.js';
import { farmsConfig, scAddress } from 'src/config';
import { FarmGetterService } from 'src/modules/farm/services/farm.getter.service';
import { LockedAssetGetterService } from 'src/modules/locked-asset-factory/services/locked.asset.getter.service';
import { PairComputeService } from 'src/modules/pair/services/pair.compute.service';
import { PairGetterService } from 'src/modules/pair/services/pair.getter.service';
import { PairService } from 'src/modules/pair/services/pair.service';
import { ContextService } from 'src/services/context/context.service';
import { computeValueUSD } from 'src/utils/token.converters';

@Injectable()
export class AnalyticsComputeService {
    constructor(
        private readonly context: ContextService,
        private readonly farmGetterService: FarmGetterService,
        private readonly pairCompute: PairComputeService,
        private readonly pairGetterService: PairGetterService,
        private readonly pairService: PairService,
        private readonly lockedAssetGetter: LockedAssetGetterService,
    ) {}

    async computeTokenPriceUSD(tokenID: string): Promise<string> {
        const tokenPriceUSD = await this.pairCompute.computeTokenPriceUSD(
            tokenID,
        );
        return tokenPriceUSD.toFixed();
    }

    async computeFarmLockedValueUSD(farmAddress: string): Promise<string> {
        const [farmingToken, farmingTokenReserve] = await Promise.all([
            this.farmGetterService.getFarmingToken(farmAddress),
            this.farmGetterService.getFarmingTokenReserve(farmAddress),
        ]);

        if (scAddress.has(farmingToken.identifier)) {
            const tokenPriceUSD = await this.pairGetterService.getTokenPriceUSD(
                scAddress.get(farmingToken.identifier),
                farmingToken.identifier,
            );
            return computeValueUSD(
                farmingTokenReserve,
                farmingToken.decimals,
                tokenPriceUSD,
            ).toFixed();
        }

        const pairAddress = await this.pairService.getPairAddressByLpTokenID(
            farmingToken.identifier,
        );
        const lockedValuesUSD = await this.pairService.getLiquidityPositionUSD(
            pairAddress,
            farmingTokenReserve,
        );
        return lockedValuesUSD;
    }

    async computeLockedValueUSDFarms(): Promise<string> {
        let totalLockedValue = new BigNumber(0);

        const promises: Promise<string>[] = farmsConfig.map(farmAddress =>
            this.computeFarmLockedValueUSD(farmAddress),
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
        let totalValueLockedUSD = new BigNumber(0);
        const promises = pairsAddress.map(pairAddress =>
            this.pairGetterService.getLockedValueUSD(pairAddress),
        );

        const lockedValuesUSD = await Promise.all([
            ...promises,
            this.computeFarmLockedValueUSD(farmsConfig[2]),
        ]);

        for (const lockedValueUSD of lockedValuesUSD) {
            const lockedValuesUSDBig = new BigNumber(lockedValueUSD);
            totalValueLockedUSD = !lockedValuesUSDBig.isNaN()
                ? totalValueLockedUSD.plus(lockedValuesUSDBig)
                : totalValueLockedUSD;
        }

        return totalValueLockedUSD.toFixed();
    }

    async computeTotalAggregatedRewards(days: number): Promise<string> {
        const farmsAddress: [] = farmsConfig;
        const promises = farmsAddress.map(async farmAddress =>
            this.farmGetterService.getRewardsPerBlock(farmAddress),
        );
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
        for (const farmAddress of farmsConfig) {
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
}
