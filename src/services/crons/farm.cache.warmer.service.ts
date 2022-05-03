import { Inject, Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { cacheConfig } from '../../config';
import { CachingService } from '../caching/cache.service';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { AbiFarmService } from 'src/modules/farm/services/abi-farm.service';
import { ElrondApiService } from '../elrond-communication/elrond-api.service';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { PUB_SUB } from '../redis.pubSub.module';
import { oneHour } from '../../helpers/helpers';
import { FarmComputeService } from 'src/modules/farm/services/farm.compute.service';
import { FarmSetterService } from 'src/modules/farm/services/farm.setter.service';
import { farmsAddresses } from 'src/utils/farm.utils';

@Injectable()
export class FarmCacheWarmerService {
    private invalidatedKeys = [];

    constructor(
        private readonly abiFarmService: AbiFarmService,
        private readonly farmSetterService: FarmSetterService,
        private readonly farmComputeService: FarmComputeService,
        private readonly apiService: ElrondApiService,
        private readonly cachingService: CachingService,
        @Inject(PUB_SUB) private pubSub: RedisPubSub,
    ) {}

    @Cron(CronExpression.EVERY_30_MINUTES)
    async cacheFarms(): Promise<void> {
        const farmsAddress: string[] = farmsAddresses();
        const promises = farmsAddress.map(async farmAddress => {
            const [
                farmTokenID,
                farmingTokenID,
                farmedTokenID,
            ] = await Promise.all([
                this.abiFarmService.getFarmTokenID(farmAddress),
                this.abiFarmService.getFarmingTokenID(farmAddress),
                this.abiFarmService.getFarmedTokenID(farmAddress),
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
                this.setContextCache(farmTokenID, farmToken, oneHour()),
                this.setContextCache(farmingTokenID, farmingToken, oneHour()),
                this.setContextCache(farmedTokenID, farmedToken, oneHour()),
            ]);
            this.invalidatedKeys.push(cacheKeys);
            await this.deleteCacheKeys();
        });

        await Promise.all(promises);
    }

    @Cron(CronExpression.EVERY_MINUTE)
    async cacheFarmInfo(): Promise<void> {
        for (const farmAddress of farmsAddresses()) {
            const [
                minimumFarmingEpochs,
                penaltyPercent,
                rewardsPerBlock,
                aprMultiplier,
                state,
                produceRewardsEnabled,
            ] = await Promise.all([
                this.abiFarmService.getMinimumFarmingEpochs(farmAddress),
                this.abiFarmService.getPenaltyPercent(farmAddress),
                this.abiFarmService.getRewardsPerBlock(farmAddress),
                this.abiFarmService.getLockedRewardAprMuliplier(farmAddress),
                this.abiFarmService.getState(farmAddress),
                this.abiFarmService.getProduceRewardsEnabled(farmAddress),
            ]);

            const cacheKeys = await Promise.all([
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
                this.farmSetterService.setLockedRewardAprMuliplier(
                    farmAddress,
                    aprMultiplier,
                ),
                this.farmSetterService.setState(farmAddress, state),
                this.farmSetterService.setProduceRewardsEnabled(
                    farmAddress,
                    produceRewardsEnabled,
                ),
            ]);
            this.invalidatedKeys.push(cacheKeys);
            await this.deleteCacheKeys();
        }
    }

    @Cron(CronExpression.EVERY_30_SECONDS)
    async cacheFarmReserves(): Promise<void> {
        for (const farmAddress of farmsAddresses()) {
            const [
                farmingTokenReserve,
                farmTokenSupply,
                lastRewardBlockNonce,
                undistributedFees,
                currentBlockFee,
                farmRewardPerShare,
                rewardReserve,
            ] = await Promise.all([
                this.abiFarmService.getFarmingTokenReserve(farmAddress),
                this.abiFarmService.getFarmTokenSupply(farmAddress),
                this.abiFarmService.getLastRewardBlockNonce(farmAddress),
                this.abiFarmService.getUndistributedFees(farmAddress),
                this.abiFarmService.getCurrentBlockFee(farmAddress),
                this.abiFarmService.getRewardPerShare(farmAddress),
                this.abiFarmService.getRewardReserve(farmAddress),
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
                this.farmSetterService.setRewardReserve(
                    farmAddress,
                    rewardReserve,
                ),
            ]);
            this.invalidatedKeys.push(cacheKeys);
            await this.deleteCacheKeys();
        }
    }

    @Cron(CronExpression.EVERY_30_SECONDS)
    async cacheFarmTokensPrices(): Promise<void> {
        for (const farmAddress of farmsAddresses()) {
            const [
                farmedTokenPriceUSD,
                farmingTokenPriceUSD,
                totalValueLockedUSD,
                unlockedRewardsAPR,
                lockedRewardsAPR,
                apr,
            ] = await Promise.all([
                this.farmComputeService.computeFarmedTokenPriceUSD(farmAddress),
                this.farmComputeService.computeFarmingTokenPriceUSD(
                    farmAddress,
                ),
                this.farmComputeService.computeFarmLockedValueUSD(farmAddress),
                this.farmComputeService.computeUnlockedRewardsAPR(farmAddress),
                this.farmComputeService.computeLockedRewardsAPR(farmAddress),
                this.farmComputeService.computeFarmAPR(farmAddress),
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
                this.farmSetterService.setTotalValueLockedUSD(
                    farmAddress,
                    totalValueLockedUSD,
                ),
                this.farmSetterService.setUnlockedRewardsAPR(
                    farmAddress,
                    unlockedRewardsAPR,
                ),
                this.farmSetterService.setLockedRewardsAPR(
                    farmAddress,
                    lockedRewardsAPR,
                ),
                this.farmSetterService.setFarmAPR(farmAddress, apr),
            ]);
            this.invalidatedKeys.push(cacheKeys);
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
