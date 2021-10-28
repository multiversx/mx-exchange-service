import { Inject, Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { cacheConfig, farmsConfig } from '../../config';
import { FarmStatisticsService } from 'src/modules/farm/services/farm-statistics.service';
import { CachingService } from '../caching/cache.service';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { AbiFarmService } from 'src/modules/farm/services/abi-farm.service';
import { ElrondApiService } from '../elrond-communication/elrond-api.service';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { PUB_SUB } from '../redis.pubSub.module';
import { oneHour, oneMinute } from '../../helpers/helpers';
import { FarmComputeService } from 'src/modules/farm/services/farm.compute.service';
import { FarmSetterService } from 'src/modules/farm/services/farm.setter.service';

@Injectable()
export class FarmCacheWarmerService {
    private invalidatedKeys = [];

    constructor(
        private readonly abiFarmService: AbiFarmService,
        private readonly farmSetterService: FarmSetterService,
        private readonly farmComputeService: FarmComputeService,
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
                this.apiService.getService().getToken(farmingTokenID),
                this.apiService.getService().getToken(farmedTokenID),
            ]);

            const cacheKeys = await Promise.all([
                this.farmSetterService.setFarmTokenID(farmAddress, farmTokenID),
                this.farmSetterService.setFarmingTokenID(
                    farmAddress,
                    farmingTokenID,
                ),
                this.farmSetterService.setFarmedTokenID(
                    farmAddress,
                    farmedTokenID,
                ),
                this.farmSetterService.setMinimumFarmingEpochs(
                    farmAddress,
                    minimumFarmingEpochs,
                ),
                this.farmSetterService.setPenaltyPercent(
                    farmAddress,
                    penaltyPercent,
                ),
                this.farmSetterService.setRewardsPerBlock(
                    farmAddress,
                    rewardsPerBlock,
                ),
                this.farmSetterService.setState(farmAddress, state),
                this.setContextCache(farmTokenID, farmToken, oneHour()),
                this.setContextCache(farmingTokenID, farmingToken, oneHour()),
                this.setContextCache(farmedTokenID, farmedToken, oneHour()),
            ]);
            this.invalidatedKeys.push(cacheKeys);
            await this.deleteCacheKeys();
        });

        await Promise.all(promises);
    }

    @Cron(CronExpression.EVERY_30_SECONDS)
    async cacheFarmReserves(): Promise<void> {
        for (const farmAddress of farmsConfig) {
            const [
                farmingTokenReserve,
                farmTokenSupply,
                lastRewardBlockNonce,
                undistributedFees,
                currentBlockFee,
                farmRewardPerShare,
            ] = await Promise.all([
                this.abiFarmService.getFarmingTokenReserve(farmAddress),
                this.abiFarmService.getFarmTokenSupply(farmAddress),
                this.abiFarmService.getLastRewardBlockNonce(farmAddress),
                this.abiFarmService.getUndistributedFees(farmAddress),
                this.abiFarmService.getCurrentBlockFee(farmAddress),
                this.abiFarmService.getRewardPerShare(farmAddress),
            ]);
            const cacheKeys = await Promise.all([
                this.farmSetterService.setFarmingTokenReserve(
                    farmAddress,
                    farmingTokenReserve,
                ),
                this.farmSetterService.setFarmTokenSupply(
                    farmAddress,
                    farmTokenSupply,
                ),
                this.farmSetterService.setLastRewardBlockNonce(
                    farmAddress,
                    lastRewardBlockNonce,
                ),
                this.farmSetterService.setUndistributedFees(
                    farmAddress,
                    undistributedFees,
                ),
                this.farmSetterService.setCurrentBlockFee(
                    farmAddress,
                    currentBlockFee,
                ),
                this.farmSetterService.setRewardPerShare(
                    farmAddress,
                    farmRewardPerShare,
                ),
            ]);
            this.invalidatedKeys.push(cacheKeys);
            await this.deleteCacheKeys();
        }
    }

    @Cron(CronExpression.EVERY_30_SECONDS)
    async cacheFarmTokensPrices(): Promise<void> {
        for (const farmAddress of farmsConfig) {
            const [
                farmedTokenPriceUSD,
                farmingTokenPriceUSD,
            ] = await Promise.all([
                this.farmComputeService.computeFarmedTokenPriceUSD(farmAddress),
                this.farmComputeService.computeFarmingTokenPriceUSD(
                    farmAddress,
                ),
            ]);
            const cacheKeys = await Promise.all([
                this.farmSetterService.setFarmedTokenPriceUSD(
                    farmAddress,
                    farmedTokenPriceUSD,
                ),
                this.farmSetterService.setFarmingTokenPriceUSD(
                    farmAddress,
                    farmingTokenPriceUSD,
                ),
            ]);
            this.invalidatedKeys.push(cacheKeys);
            await this.deleteCacheKeys();
        }
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

    private async setContextCache(
        key: string,
        value: any,
        ttl: number = cacheConfig.default,
    ): Promise<string> {
        const cacheKey = generateCacheKeyFromParams('context', key);
        await this.cachingService.setCache(cacheKey, value, ttl);
        return cacheKey;
    }

    private async deleteCacheKeys() {
        await this.pubSub.publish('deleteCacheKeys', this.invalidatedKeys);
        this.invalidatedKeys = [];
    }
}
