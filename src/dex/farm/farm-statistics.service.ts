import { Injectable } from '@nestjs/common';
import { scAddress } from '../../config';
import { FarmService } from './farm.service';
import BigNumber from 'bignumber.js';
import { PairService } from '../pair/pair.service';

@Injectable()
export class FarmStatisticsService {
    constructor(
        private farmService: FarmService,
        private pairService: PairService,
    ) {}

    async computeFarmAPR(farmAddress: string): Promise<string> {
        const farmedTokenID = await this.farmService.getFarmedTokenID(
            farmAddress,
        );

        const [
            farmedTokenPriceUSD,
            farmingTokenPriceUSD,
            farmTokenSupply,
            farmingTokenReserve,
            rewardsPerBlock,
        ] = await Promise.all([
            this.pairService.getTokenPriceUSD(
                scAddress.get(farmedTokenID),
                farmedTokenID,
            ),
            this.getFarmingTokenPriceUSD(farmAddress),
            this.farmService.getFarmTokenSupply(farmAddress),
            this.farmService.getFarmingTokenReserve(farmAddress),
            this.farmService.getRewardsPerBlock(farmAddress),
        ]);

        const farmTokenSupplyBig = new BigNumber(farmTokenSupply);
        const farmingTokenReserveBig = new BigNumber(farmingTokenReserve);

        const farmingTokenValue = new BigNumber(farmingTokenPriceUSD).dividedBy(
            new BigNumber(farmedTokenPriceUSD),
        );
        const unlockedFarmingTokens = farmingTokenReserveBig
            .multipliedBy(2)
            .minus(farmTokenSupplyBig);
        const unlockedFarmingTokensValue = unlockedFarmingTokens.multipliedBy(
            farmingTokenValue,
        );

        // blocksPerYear = NumberOfDaysInYear * HoursInDay * MinutesInHour * SecondsInMinute / BlockPeriod;
        const blocksPerYear = (365 * 24 * 60 * 60) / 6;
        const totalRewardsPerYear = new BigNumber(rewardsPerBlock).multipliedBy(
            blocksPerYear,
        );

        const unlockedFarmingTokensRewards = totalRewardsPerYear
            .multipliedBy(unlockedFarmingTokens)
            .dividedBy(farmTokenSupplyBig);
        const farmAPR = unlockedFarmingTokensRewards.dividedBy(
            unlockedFarmingTokensValue,
        );

        return farmAPR.toString();
    }

    private async getFarmingTokenPriceUSD(
        farmAddress: string,
    ): Promise<string> {
        const farmingTokenID = await this.farmService.getFarmingTokenID(
            farmAddress,
        );
        if (scAddress.has(farmingTokenID)) {
            const pairAddress = scAddress.get(farmingTokenID);
            return await this.pairService.getTokenPriceUSD(
                pairAddress,
                farmingTokenID,
            );
        }

        const pairAddress = await this.pairService.getPairAddressByLpTokenID(
            farmingTokenID,
        );
        return this.pairService.getLpTokenPriceUSD(pairAddress);
    }
}
