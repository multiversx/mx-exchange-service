import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { cacheConfig, farmsConfig } from '../../config';
import { FarmStatisticsService } from 'src/modules/farm/farm-statistics.service';
import { RedisCacheService } from '../redis-cache.service';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { FarmService } from 'src/modules/farm/farm.service';
import { AbiFarmService } from 'src/modules/farm/abi-farm.service';
import { ElrondApiService } from '../elrond-communication/elrond-api.service';

@Injectable()
export class FarmCacheWarmerService {
    constructor(
        private readonly abiFarmService: AbiFarmService,
        private readonly farmService: FarmService,
        private readonly farmStatisticsService: FarmStatisticsService,
        private readonly apiService: ElrondApiService,
        private readonly redisCacheService: RedisCacheService,
    ) {}

    @Cron(CronExpression.EVERY_30_SECONDS)
    async cacheFarms(): Promise<void> {
        const farmsAddress: string[] = farmsConfig;
        const promises = farmsAddress.map(async farmAddress => {
            const [
                farmTokenID,
                farmingTokenID,
                farmedTokenID,
                minimumFarmingEpochs,
                penaltyPercent,
                rewardsPerBlock,
                state,
            ] = await Promise.all([
                this.abiFarmService.getFarmTokenID(farmAddress),
                this.abiFarmService.getFarmingTokenID(farmAddress),
                this.abiFarmService.getFarmedTokenID(farmAddress),
                this.abiFarmService.getMinimumFarmingEpochs(farmAddress),
                this.abiFarmService.getPenaltyPercent(farmAddress),
                this.abiFarmService.getRewardsPerBlock(farmAddress),
                this.abiFarmService.getState(farmAddress),
            ]);
            let cacheKey = generateCacheKeyFromParams(
                'farm',
                farmAddress,
                'farmTokenID',
            );
            this.redisCacheService.set(
                this.redisCacheService.getClient(),
                cacheKey,
                farmTokenID,
                cacheConfig.token,
            );
            cacheKey = generateCacheKeyFromParams(
                'farm',
                farmAddress,
                'farmingTokenID',
            );
            this.redisCacheService.set(
                this.redisCacheService.getClient(),
                cacheKey,
                farmingTokenID,
                cacheConfig.token,
            );
            cacheKey = generateCacheKeyFromParams(
                'farm',
                farmAddress,
                'farmedTokenID',
            );
            this.redisCacheService.set(
                this.redisCacheService.getClient(),
                cacheKey,
                farmedTokenID,
                cacheConfig.token,
            );
            cacheKey = generateCacheKeyFromParams(
                'farm',
                farmAddress,
                'minimumFarmingEpochs',
            );
            this.redisCacheService.set(
                this.redisCacheService.getClient(),
                cacheKey,
                minimumFarmingEpochs,
                cacheConfig.default,
            );
            cacheKey = generateCacheKeyFromParams(
                'farm',
                farmAddress,
                'penaltyPercent',
            );
            this.redisCacheService.set(
                this.redisCacheService.getClient(),
                cacheKey,
                penaltyPercent,
                cacheConfig.default,
            );
            cacheKey = generateCacheKeyFromParams(
                'farm',
                farmAddress,
                'rewardsPerBlock',
            );
            this.redisCacheService.set(
                this.redisCacheService.getClient(),
                cacheKey,
                rewardsPerBlock,
                cacheConfig.default,
            );
            cacheKey = generateCacheKeyFromParams('farm', farmAddress, 'state');
            this.redisCacheService.set(
                this.redisCacheService.getClient(),
                cacheKey,
                state,
                cacheConfig.state,
            );

            const [farmToken, farmingToken, farmedToken] = await Promise.all([
                this.apiService.getNftCollection(farmTokenID),
                this.apiService.getService().getESDTToken(farmingTokenID),
                this.apiService.getService().getESDTToken(farmedTokenID),
            ]);

            cacheKey = generateCacheKeyFromParams('context', farmTokenID);
            this.redisCacheService.set(
                this.redisCacheService.getClient(),
                cacheKey,
                farmToken,
                cacheConfig.token,
            );
            cacheKey = generateCacheKeyFromParams('context', farmingTokenID);
            this.redisCacheService.set(
                this.redisCacheService.getClient(),
                cacheKey,
                farmingToken,
                cacheConfig.token,
            );
            cacheKey = generateCacheKeyFromParams('context', farmedTokenID);
            this.redisCacheService.set(
                this.redisCacheService.getClient(),
                cacheKey,
                farmedToken,
                cacheConfig.token,
            );
        });

        Promise.all(promises);
    }

    @Cron(CronExpression.EVERY_10_SECONDS)
    async cacheFarmReserves(): Promise<void> {
        for (const farmAddress of farmsConfig) {
            const [farmingTokenReserve, farmTokenSupply] = await Promise.all([
                this.abiFarmService.getFarmingTokenReserve(farmAddress),
                this.abiFarmService.getFarmTokenSupply(farmAddress),
            ]);

            let cacheKey = generateCacheKeyFromParams(
                'farm',
                farmAddress,
                'farmingTokenReserve',
            );
            this.redisCacheService.set(
                this.redisCacheService.getClient(),
                cacheKey,
                farmingTokenReserve,
                cacheConfig.reserves,
            );
            cacheKey = generateCacheKeyFromParams(
                'farm',
                farmAddress,
                'farmTokenSupply',
            );
            this.redisCacheService.set(
                this.redisCacheService.getClient(),
                cacheKey,
                farmTokenSupply,
                cacheConfig.reserves,
            );
        }
    }

    @Cron(CronExpression.EVERY_10_SECONDS)
    async cacheFarmTokensPrices(): Promise<void> {
        for (const farmAddress of farmsConfig) {
            const [
                farmedTokenPriceUSD,
                farmingTokenPriceUSD,
            ] = await Promise.all([
                this.farmService.computeFarmedTokenPriceUSD(farmAddress),
                this.farmService.computeFarmingTokenPriceUSD(farmAddress),
            ]);

            const farmedTokenCacheKey = generateCacheKeyFromParams(
                'farm',
                farmAddress,
                'farmedTokenPriceUSD',
            );
            const farmingTokenCacheKey = generateCacheKeyFromParams(
                'farm',
                farmAddress,
                'farmingTokenPriceUSD',
            );

            this.redisCacheService.set(
                this.redisCacheService.getClient(),
                farmedTokenCacheKey,
                farmedTokenPriceUSD,
                cacheConfig.tokenPrice,
            );
            this.redisCacheService.set(
                this.redisCacheService.getClient(),
                farmingTokenCacheKey,
                farmingTokenPriceUSD,
                cacheConfig.tokenPrice,
            );
        }
    }

    @Cron(CronExpression.EVERY_30_SECONDS)
    async cacheApr(): Promise<void> {
        for (const farmAddress of farmsConfig) {
            const apr = await this.farmStatisticsService.computeFarmAPR(
                farmAddress,
            );
            const cacheKey = generateCacheKeyFromParams(
                'farmStatistics',
                farmAddress,
                'apr',
            );

            this.redisCacheService.set(
                this.redisCacheService.getClient(),
                cacheKey,
                apr,
                cacheConfig.apr,
            );
        }
    }
}
