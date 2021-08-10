import { Inject, Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { cacheConfig, farmsConfig } from '../../config';
import { FarmStatisticsService } from 'src/modules/farm/farm-statistics.service';
import { CachingService } from '../caching/cache.service';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { FarmService } from 'src/modules/farm/farm.service';
import { AbiFarmService } from 'src/modules/farm/abi-farm.service';
import { ElrondApiService } from '../elrond-communication/elrond-api.service';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class FarmCacheWarmerService {
    constructor(
        private readonly abiFarmService: AbiFarmService,
        private readonly farmService: FarmService,
        private readonly farmStatisticsService: FarmStatisticsService,
        private readonly apiService: ElrondApiService,
        private readonly cachingService: CachingService,
        @Inject('PUBSUB_SERVICE') private readonly client: ClientProxy,
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

            const [farmToken, farmingToken, farmedToken] = await Promise.all([
                this.apiService.getNftCollection(farmTokenID),
                this.apiService.getService().getESDTToken(farmingTokenID),
                this.apiService.getService().getESDTToken(farmedTokenID),
            ]);

            await Promise.all([
                this.setFarmCache(
                    farmAddress,
                    'farmTokenID',
                    farmTokenID,
                    cacheConfig.token,
                ),
                this.setFarmCache(
                    farmAddress,
                    'farmingTokenID',
                    farmingTokenID,
                    cacheConfig.token,
                ),
                this.setFarmCache(
                    farmAddress,
                    'farmedTokenID',
                    farmedTokenID,
                    cacheConfig.token,
                ),
                this.setFarmCache(
                    farmAddress,
                    'minimumFarmingEpochs',
                    minimumFarmingEpochs,
                ),
                this.setFarmCache(
                    farmAddress,
                    'penaltyPercent',
                    penaltyPercent,
                ),
                this.setFarmCache(
                    farmAddress,
                    'rewardsPerBlock',
                    rewardsPerBlock,
                ),
                this.setFarmCache(farmAddress, 'state', state),
                this.setContextCache(farmTokenID, farmToken, cacheConfig.token),
                this.setContextCache(
                    farmingTokenID,
                    farmingToken,
                    cacheConfig.token,
                ),
                this.setContextCache(
                    farmedTokenID,
                    farmedToken,
                    cacheConfig.token,
                ),
            ]);
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
            await Promise.all([
                this.setFarmCache(
                    farmAddress,
                    'farmingTokenReserve',
                    farmingTokenReserve,
                    cacheConfig.reserves,
                ),
                this.setFarmCache(
                    farmAddress,
                    'farmTokenSupply',
                    farmTokenSupply,
                    cacheConfig.reserves,
                ),
            ]);
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
            await Promise.all([
                this.setFarmCache(
                    farmAddress,
                    'farmedTokenPriceUSD',
                    farmedTokenPriceUSD,
                    cacheConfig.tokenPrice,
                ),
                this.setFarmCache(
                    farmAddress,
                    'farmingTokenPriceUSD',
                    farmingTokenPriceUSD,
                    cacheConfig.tokenPrice,
                ),
            ]);
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

            this.cachingService.setCache(cacheKey, apr, cacheConfig.apr);
            await this.deleteCacheKey(cacheKey);
        }
    }

    private async setFarmCache(
        farmAddress: string,
        key: string,
        value: any,
        ttl: number = cacheConfig.default,
    ) {
        const cacheKey = generateCacheKeyFromParams('farm', farmAddress, key);
        await this.cachingService.setCache(cacheKey, value, ttl);
        await this.deleteCacheKey(cacheKey);
    }

    private async setContextCache(
        key: string,
        value: any,
        ttl: number = cacheConfig.default,
    ) {
        const cacheKey = generateCacheKeyFromParams('context', key);
        await this.cachingService.setCache(cacheKey, value, ttl);
        await this.deleteCacheKey(cacheKey);
    }

    private async deleteCacheKey(key: string) {
        await this.client.emit('deleteCacheKeys', [key]);
    }
}
