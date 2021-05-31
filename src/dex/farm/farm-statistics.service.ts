import { Injectable } from '@nestjs/common';
import { scAddress } from '../../config';
import { ContextService } from '../utils/context.service';
import { FarmService } from './farm.service';
import BigNumber from 'bignumber.js';
import { PairService } from '../pair/pair.service';

@Injectable()
export class FarmStatisticsService {
    constructor(
        private farmService: FarmService,
        private context: ContextService,
        private pairService: PairService,
    ) {}

    async computeFarmAPR(farmAddress: string): Promise<string> {
        const farmedTokenID = await this.farmService.getFarmedTokenID(
            farmAddress,
        );
        const farmedTokenPriceUSD = await this.pairService.getTokenPriceUSD(
            scAddress.get(farmedTokenID),
            farmedTokenID,
        );

        const farmTokenSupply = await this.farmService.getFarmTokenSupply(
            farmAddress,
        );
        const farmingTokenReserve = await this.farmService.getFarmingTokenReserve(
            farmAddress,
        );

        const rewardsPerBlock = await this.farmService.getRewardsPerBlock(
            farmAddress,
        );

        const farmTokenSupplyBig = new BigNumber(farmTokenSupply);
        const farmingTokenReserveBig = new BigNumber(farmingTokenReserve);

        const farmingTokenPriceUSD = await this.getFarmingTokenPriceUSD(
            farmAddress,
        );

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

        const farmedTokenID = await this.farmService.getFarmedTokenID(
            farmAddress,
        );

        let farmingTokenPriceUSD;
        switch (farmingTokenID) {
            case farmedTokenID:
                const pairAddress = scAddress.get(farmedTokenID);
                farmingTokenPriceUSD = await this.pairService.getTokenPriceUSD(
                    pairAddress,
                    farmedTokenID,
                );
                break;
            default:
                const pairsAddress = await this.context.getAllPairsAddress();
                for (const pairAddress of pairsAddress) {
                    const lpToken = await this.pairService.getLpToken(
                        pairAddress,
                    );
                    if (lpToken.token === farmingTokenID) {
                        farmingTokenPriceUSD = await this.pairService.getLpTokenPriceUSD(
                            pairAddress,
                        );
                        break;
                    }
                }
                break;
        }
        return farmingTokenPriceUSD;
    }
}
