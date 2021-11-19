import { Inject, Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { CachingService } from '../../../services/caching/cache.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { generateCacheKeyFromParams } from '../../../utils/generate-cache-key';
import { generateGetLogMessage } from '../../../utils/generate-log-message';
import { oneMinute, oneSecond } from '../../../helpers/helpers';
import { FarmGetterService } from './farm.getter.service';
import { PairComputeService } from 'src/modules/pair/services/pair.compute.service';
import { computeValueUSD } from 'src/utils/token.converters';
import { FarmComputeService } from './farm.compute.service';

@Injectable()
export class FarmStatisticsService {
    constructor(
        private farmGetterService: FarmGetterService,
        private farmComputeService: FarmComputeService,
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
        const farmedToken = await this.farmGetterService.getFarmedToken(
            farmAddress,
        );

        const [farmedTokenPriceUSD, rewardsPerBlock] = await Promise.all([
            this.pairComputeService.computeTokenPriceUSD(
                farmedToken.identifier,
            ),
            this.farmGetterService.getRewardsPerBlock(farmAddress),
        ]);

        // blocksPerYear = NumberOfDaysInYear * HoursInDay * MinutesInHour * SecondsInMinute / BlockPeriod;
        const blocksPerYear = (365 * 24 * 60 * 60) / 6;
        const totalRewardsPerYear = new BigNumber(rewardsPerBlock).multipliedBy(
            blocksPerYear,
        );

        const totalFarmingTokenValueUSD = await this.farmComputeService.computeFarmLockedValueUSD(
            farmAddress,
        );

        const totalRewardsPerYearUSD = computeValueUSD(
            totalRewardsPerYear.toFixed(),
            farmedToken.decimals,
            farmedTokenPriceUSD.toFixed(),
        );
        console.log({
            farmAddress: farmAddress,
            totalFarmingTokenValueUSD: totalFarmingTokenValueUSD,
            totalRewardsPerYearUSD: totalRewardsPerYearUSD.toFixed(),
        });
        const apr = totalRewardsPerYearUSD.div(totalFarmingTokenValueUSD);

        return apr.toFixed();
    }
}
