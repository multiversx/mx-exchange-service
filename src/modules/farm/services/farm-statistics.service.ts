import { Inject, Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { CachingService } from '../../../services/caching/cache.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { generateCacheKeyFromParams } from '../../../utils/generate-cache-key';
import { generateGetLogMessage } from '../../../utils/generate-log-message';
import { oneMinute } from '../../../helpers/helpers';
import { FarmGetterService } from './farm.getter.service';
import { PairComputeService } from 'src/modules/pair/services/pair.compute.service';

@Injectable()
export class FarmStatisticsService {
    constructor(
        private farmGetterService: FarmGetterService,
        private pairComputeService: PairComputeService,
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
            throw error;
        }
    }

    async computeFarmAPR(farmAddress: string): Promise<string> {
        const farmedTokenID = await this.farmGetterService.getFarmedTokenID(
            farmAddress,
        );

        const [
            farmedTokenPriceUSD,
            farmingTokenPriceUSD,
            farmTokenSupply,
            farmingTokenReserve,
            rewardsPerBlock,
        ] = await Promise.all([
            this.pairComputeService.computeTokenPriceUSD(farmedTokenID),
            this.farmGetterService.getFarmingTokenPriceUSD(farmAddress),
            this.farmGetterService.getFarmTokenSupply(farmAddress),
            this.farmGetterService.getFarmingTokenReserve(farmAddress),
            this.farmGetterService.getRewardsPerBlock(farmAddress),
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
