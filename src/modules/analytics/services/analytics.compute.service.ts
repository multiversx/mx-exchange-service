import { Injectable } from '@nestjs/common';
import { BigNumber } from 'bignumber.js';
import { farmsConfig } from 'src/config';
import { FarmGetterService } from 'src/modules/farm/services/farm.getter.service';
import { PairGetterService } from 'src/modules/pair/services/pair.getter.service';
import { PairService } from 'src/modules/pair/services/pair.service';
import { ContextService } from 'src/services/context/context.service';

@Injectable()
export class AnalyticsComputeService {
    constructor(
        private readonly context: ContextService,
        private readonly farmGetterService: FarmGetterService,
        private readonly pairService: PairService,
        private readonly pairGetterService: PairGetterService,
    ) {}

    async computeTokenPriceUSD(tokenID: string): Promise<string> {
        const tokenPriceUSD = await this.pairService.getPriceUSDByPath(tokenID);
        return tokenPriceUSD.toFixed();
    }

    async computeFarmLockedValueUSD(farmAddress: string): Promise<string> {
        const [
            farmingToken,
            farmingTokenPriceUSD,
            farmingTokenReserve,
        ] = await Promise.all([
            this.farmGetterService.getFarmingToken(farmAddress),
            this.farmGetterService.getFarmingTokenPriceUSD(farmAddress),
            this.farmGetterService.getFarmingTokenReserve(farmAddress),
        ]);

        const lockedValue = new BigNumber(farmingTokenReserve)
            .multipliedBy(`1e-${farmingToken.decimals}`)
            .multipliedBy(farmingTokenPriceUSD);

        return lockedValue.toFixed();
    }

    async computeLockedValueUSDFarms(): Promise<string> {
        let totalLockedValue = new BigNumber(0);

        const promises: Promise<string>[] = farmsConfig.map(farmAddress =>
            this.computeFarmLockedValueUSD(farmAddress),
        );
        const farmsLockedValueUSD = await Promise.all(promises);
        for (const farmLockedValueUSD of farmsLockedValueUSD) {
            totalLockedValue = totalLockedValue.plus(farmLockedValueUSD);
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
            totalValueLockedUSD = totalValueLockedUSD.plus(lockedValueUSD);
        }

        return totalValueLockedUSD.toFixed();
    }

    async computeTotalAgregatedRewards(days: number): Promise<string> {
        const farmsAddress: [] = farmsConfig;
        const promises = farmsAddress.map(async farmAddress =>
            this.farmGetterService.getRewardsPerBlock(farmAddress),
        );
        const farmsRewardsPerBlock = await Promise.all(promises);
        const blocksNumber = (days * 24 * 60 * 60) / 6;

        let totalAgregatedRewards = new BigNumber(0);
        for (const rewardsPerBlock of farmsRewardsPerBlock) {
            const agregatedRewards = new BigNumber(
                rewardsPerBlock,
            ).multipliedBy(blocksNumber);
            totalAgregatedRewards = totalAgregatedRewards.plus(
                agregatedRewards,
            );
        }
        return totalAgregatedRewards.toFixed();
    }
}
