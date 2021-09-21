import { Inject, Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { cacheConfig, farmsConfig } from '../../config';
import { FarmStatisticsService } from 'src/modules/farm/services/farm-statistics.service';
import { CachingService } from '../caching/cache.service';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { FarmService } from 'src/modules/farm/services/farm.service';
import { AbiFarmService } from 'src/modules/farm/services/abi-farm.service';
import { ElrondApiService } from '../elrond-communication/elrond-api.service';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { PUB_SUB } from '../redis.pubSub.module';
import { oneHour, oneMinute } from '../../helpers/helpers';

@Injectable()
export class FarmCacheWarmerService {
    private invalidatedKeys = [];

    constructor(
        private readonly abiFarmService: AbiFarmService,
        private readonly farmService: FarmService,
        private readonly farmStatisticsService: FarmStatisticsService,
        private readonly apiService: ElrondApiService,
        private readonly cachingService: CachingService,
        @Inject(PUB_SUB) private pubSub: RedisPubSub,
    ) {}

    @Cron(CronExpression.EVERY_30_MINUTES)
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
                    oneHour(),
                ),
                this.setFarmCache(
                    farmAddress,
                    'farmingTokenID',
                    farmingTokenID,
                    oneHour(),
                ),
                this.setFarmCache(
                    farmAddress,
                    'farmedTokenID',
                    farmedTokenID,
                    oneHour(),
                ),
                this.setFarmCache(
                    farmAddress,
                    'minimumFarmingEpochs',
                    minimumFarmingEpochs,
                    oneHour(),
                ),
                this.setFarmCache(
                    farmAddress,
                    'penaltyPercent',
                    penaltyPercent,
                    oneHour(),
                ),
                this.setFarmCache(
                    farmAddress,
                    'rewardsPerBlock',
                    rewardsPerBlock,
                    oneHour(),
                ),
                this.setFarmCache(farmAddress, 'state', state, oneHour()),
                this.setContextCache(farmTokenID, farmToken, oneHour()),
                this.setContextCache(farmingTokenID, farmingToken, oneHour()),
                this.setContextCache(farmedTokenID, farmedToken, oneHour()),
            ]);
        });

        await Promise.all(promises);
        await this.deleteCacheKeys();
    }

    @Cron(CronExpression.EVERY_30_SECONDS)
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
                    oneMinute(),
                ),
                this.setFarmCache(
                    farmAddress,
                    'farmTokenSupply',
                    farmTokenSupply,
                    oneMinute(),
                ),
            ]);
        }
        await this.deleteCacheKeys();
    }

    @Cron(CronExpression.EVERY_30_SECONDS)
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
                    oneMinute(),
                ),
                this.setFarmCache(
                    farmAddress,
                    'farmingTokenPriceUSD',
                    farmingTokenPriceUSD,
                    oneMinute(),
                ),
            ]);
        }
        await this.deleteCacheKeys();
    }

    @Cron('*/45 * * * * *')
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

            this.cachingService.setCache(cacheKey, apr, oneMinute());
            this.invalidatedKeys.push(cacheKey);
            await this.deleteCacheKeys();
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
        this.invalidatedKeys.push(cacheKey);
    }

    private async setContextCache(
        key: string,
        value: any,
        ttl: number = cacheConfig.default,
    ) {
        const cacheKey = generateCacheKeyFromParams('context', key);
        await this.cachingService.setCache(cacheKey, value, ttl);
        this.invalidatedKeys.push(cacheKey);
    }

    private async deleteCacheKeys() {
        await this.pubSub.publish('deleteCacheKeys', this.invalidatedKeys);
        this.invalidatedKeys = [];
    }
}
