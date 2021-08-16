import { Inject, Injectable } from '@nestjs/common';
import { scAddress } from '../../config';
import { FarmService } from './farm.service';
import BigNumber from 'bignumber.js';
import { PairService } from '../pair/pair.service';
import { CachingService } from '../../services/caching/cache.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { generateCacheKeyFromParams } from '../../utils/generate-cache-key';
import { generateGetLogMessage } from '../../utils/generate-log-message';
import { oneMinute } from '../../helpers/helpers';

@Injectable()
export class FarmStatisticsService {
    constructor(
        private farmService: FarmService,
        private pairService: PairService,
        private cachingService: CachingService,
        @Inject(WINSTON_MODULE_PROVIDER) private logger: Logger,
    ) {}

    async getFarmAPR(farmAddress: string): Promise<string> {
        const cacheKey = generateCacheKeyFromParams(
            'farmStatistics',
            farmAddress,
            'apr',
        );
        try {
            const getFarmAPR = () => this.computeFarmAPR(farmAddress);
            return this.cachingService.getOrSet(
                cacheKey,
                getFarmAPR,
                oneMinute(),
            );
        } catch (error) {
            const logMessage = generateGetLogMessage(
                FarmStatisticsService.name,
                this.getFarmAPR.name,
                cacheKey,
                error,
            );
            this.logger.error(logMessage);
        }
    }

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
            this.pairService.computeTokenPriceUSD(
                scAddress.get(farmedTokenID),
                farmedTokenID,
            ),
            this.farmService.getFarmingTokenPriceUSD(farmAddress),
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

        return farmAPR.toFixed();
    }
}
