import { Inject, Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { cacheConfig, scAddress } from 'src/config';
import { oneHour } from 'src/helpers/helpers';
import { AbiStakingService } from 'src/modules/staking/services/staking.abi.service';
import { StakingSetterService } from 'src/modules/staking/services/staking.setter.service';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';
import { CachingService } from '../caching/cache.service';
import { ElrondApiService } from '../elrond-communication/elrond-api.service';
import { PUB_SUB } from '../redis.pubSub.module';

@Injectable()
export class StakingCacheWarmerService {
    constructor(
        private readonly abiStakeService: AbiStakingService,
        private readonly stakeSetterService: StakingSetterService,
        private readonly apiService: ElrondApiService,
        private readonly cachingService: CachingService,
        @Inject(PUB_SUB) private pubSub: RedisPubSub,
    ) {}

    @Cron(CronExpression.EVERY_30_MINUTES)
    async cacheFarmsStaking(): Promise<void> {
        const farmsStakingAddresses = scAddress.staking;
        for (const address of farmsStakingAddresses) {
            const [
                farmTokenID,
                farmingTokenID,
                rewardTokenID,
            ] = await Promise.all([
                this.abiStakeService.getFarmTokenID(address),
                this.abiStakeService.getFarmingTokenID(address),
                this.abiStakeService.getRewardTokenID(address),
            ]);

            const [farmToken, farmingToken, rewardToken] = await Promise.all([
                this.apiService.getNftCollection(farmTokenID),
                this.apiService.getService().getToken(farmingTokenID),
                this.apiService.getService().getToken(rewardTokenID),
            ]);

            const cacheKeys = await Promise.all([
                this.stakeSetterService.setFarmTokenID(address, farmTokenID),
                this.stakeSetterService.setFarmingTokenID(
                    address,
                    farmingTokenID,
                ),
                this.stakeSetterService.setRewardTokenID(
                    address,
                    rewardTokenID,
                ),
                this.setContextCache(farmTokenID, farmToken, oneHour()),
                this.setContextCache(farmingTokenID, farmingToken, oneHour()),
                this.setContextCache(rewardTokenID, rewardToken, oneHour()),
            ]);

            await this.deleteCacheKeys(cacheKeys);
        }
    }

    @Cron(CronExpression.EVERY_MINUTE)
    async cacheStakingInfo(): Promise<void> {
        const farmsStakingAddresses = scAddress.staking;
        for (const address of farmsStakingAddresses) {
            const [
                annualPercentageRewards,
                minUnboundEpochs,
                penaltyPercent,
                minimumFarmingEpochs,
                divisionSafetyConstant,
                state,
            ] = await Promise.all([
                this.abiStakeService.getAnnualPercentageRewards(address),
                this.abiStakeService.getMinUnbondEpochs(address),
                this.abiStakeService.getPenaltyPercent(address),
                this.abiStakeService.getMinimumFarmingEpoch(address),
                this.abiStakeService.getDivisionSafetyConstant(address),
                this.abiStakeService.getState(address),
            ]);

            const cacheKeys = await Promise.all([
                this.stakeSetterService.setAnnualPercentageRewards(
                    address,
                    annualPercentageRewards,
                ),
                this.stakeSetterService.setMinUnbondEpochs(
                    address,
                    minUnboundEpochs,
                ),
                this.stakeSetterService.setPenaltyPercent(
                    address,
                    penaltyPercent,
                ),
                this.stakeSetterService.setMinimumFarmingEpoch(
                    address,
                    minimumFarmingEpochs,
                ),
                this.stakeSetterService.setDivisionSafetyConstant(
                    address,
                    divisionSafetyConstant,
                ),
                this.stakeSetterService.setState(address, state),
            ]);

            await this.deleteCacheKeys(cacheKeys);
        }
    }

    @Cron(CronExpression.EVERY_30_SECONDS)
    async cacheStakingRewards(): Promise<void> {
        const farmsStakingAddresses = scAddress.staking;
        for (const address of farmsStakingAddresses) {
            const [
                farmTokenSupply,
                rewardPerShare,
                accumulatedRewards,
                rewardCapacity,
                perBlockRewards,
                lastRewardBlockNonce,
            ] = await Promise.all([
                this.abiStakeService.getFarmTokenSupply(address),
                this.abiStakeService.getRewardPerShare(address),
                this.abiStakeService.getAccumulatedRewards(address),
                this.abiStakeService.getRewardCapacity(address),
                this.abiStakeService.getPerBlockRewardAmount(address),
                this.abiStakeService.getLastRewardBlockNonce(address),
            ]);

            const cacheKeys = await Promise.all([
                this.stakeSetterService.setFarmTokenSupply(
                    address,
                    farmTokenSupply,
                ),
                this.stakeSetterService.setRewardPerShare(
                    address,
                    rewardPerShare,
                ),
                this.stakeSetterService.setAccumulatedRewards(
                    address,
                    accumulatedRewards,
                ),
                this.stakeSetterService.setRewardCapacity(
                    address,
                    rewardCapacity,
                ),
                this.stakeSetterService.setPerBlockRewardAmount(
                    address,
                    perBlockRewards,
                ),
                this.stakeSetterService.setLastRewardBlockNonce(
                    address,
                    lastRewardBlockNonce,
                ),
            ]);

            await this.deleteCacheKeys(cacheKeys);
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

    private async deleteCacheKeys(invalidatedKeys: string[]) {
        await this.pubSub.publish('deleteCacheKeys', invalidatedKeys);
    }
}
