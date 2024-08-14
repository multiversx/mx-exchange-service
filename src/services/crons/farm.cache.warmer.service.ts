import { Inject, Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { PUB_SUB } from '../redis.pubSub.module';
import { farmVersion } from 'src/utils/farm.utils';
import { FarmVersion } from 'src/modules/farm/models/farm.model';
import { FarmComputeServiceV1_2 } from 'src/modules/farm/v1.2/services/farm.v1.2.compute.service';
import { FarmComputeServiceV1_3 } from 'src/modules/farm/v1.3/services/farm.v1.3.compute.service';
import { FarmAbiFactory } from 'src/modules/farm/farm.abi.factory';
import { FarmAbiServiceV1_2 } from 'src/modules/farm/v1.2/services/farm.v1.2.abi.service';
import { FarmComputeFactory } from 'src/modules/farm/farm.compute.factory';
import { FarmSetterFactory } from 'src/modules/farm/farm.setter.factory';
import { FarmFactoryService } from 'src/modules/farm/farm.factory';

@Injectable()
export class FarmCacheWarmerService {
    private invalidatedKeys = [];

    constructor(
        private readonly farmAbiFactory: FarmAbiFactory,
        private readonly farmAbiV1_2: FarmAbiServiceV1_2,
        private readonly farmFactory: FarmFactoryService,
        private readonly farmComputeFactory: FarmComputeFactory,
        private readonly farmComputeV1_2: FarmComputeServiceV1_2,
        private readonly farmComputeV1_3: FarmComputeServiceV1_3,
        private readonly farmSetterFactory: FarmSetterFactory,
        @Inject(PUB_SUB) private pubSub: RedisPubSub,
    ) {}

    @Cron(CronExpression.EVERY_HOUR)
    async cacheFarmsTokens(): Promise<void> {
        const farmsAddress = await this.farmFactory.getFarmsAddresses();
        const promises = farmsAddress.map(async (farmAddress) => {
            const [farmTokenID, farmingTokenID, farmedTokenID] =
                await Promise.all([
                    this.farmAbiFactory
                        .useAbi(farmAddress)
                        .getFarmTokenIDRaw(farmAddress),
                    this.farmAbiFactory
                        .useAbi(farmAddress)
                        .getFarmingTokenIDRaw(farmAddress),
                    this.farmAbiFactory
                        .useAbi(farmAddress)
                        .getFarmedTokenIDRaw(farmAddress),
                ]);

            const cacheKeys = await Promise.all([
                this.farmSetterFactory
                    .useSetter(farmAddress)
                    .setFarmTokenID(farmAddress, farmTokenID),
                this.farmSetterFactory
                    .useSetter(farmAddress)
                    .setFarmingTokenID(farmAddress, farmingTokenID),
                this.farmSetterFactory
                    .useSetter(farmAddress)
                    .setFarmedTokenID(farmAddress, farmedTokenID),
            ]);
            this.invalidatedKeys.push(cacheKeys);
            await this.deleteCacheKeys();
        });

        await Promise.all(promises);
    }

    @Cron(CronExpression.EVERY_30_SECONDS)
    async cacheFarmsV1_2(): Promise<void> {
        const farmsAddresses = await this.farmFactory.getFarmsAddresses();
        for (const address of farmsAddresses) {
            if (farmVersion(address) !== FarmVersion.V1_2) {
                continue;
            }
            const [
                aprMultiplier,
                farmingTokenReserve,
                unlockedRewardsAPR,
                lockedRewardsAPR,
            ] = await Promise.all([
                this.farmAbiV1_2.getLockedRewardAprMuliplierRaw(address),
                this.farmAbiV1_2.getFarmingTokenReserveRaw(address),
                this.farmComputeV1_2.computeUnlockedRewardsAPR(address),
                this.farmComputeV1_2.computeLockedRewardsAPR(address),
            ]);

            const cachedKeys = await Promise.all([
                this.farmSetterFactory
                    .useSetter(address)
                    .setLockedRewardAprMuliplier(address, aprMultiplier),
                this.farmSetterFactory
                    .useSetter(address)
                    .setFarmingTokenReserve(address, farmingTokenReserve),
                this.farmSetterFactory
                    .useSetter(address)
                    .setUnlockedRewardsAPR(address, unlockedRewardsAPR),
                this.farmSetterFactory
                    .useSetter(address)
                    .setLockedRewardsAPR(address, lockedRewardsAPR),
            ]);
            this.invalidatedKeys.push(...cachedKeys);
            await this.deleteCacheKeys();
        }
    }

    @Cron(CronExpression.EVERY_30_SECONDS)
    async cacheFarmsV1_3(): Promise<void> {
        const farmsAddresses = await this.farmFactory.getFarmsAddresses();
        for (const address of farmsAddresses) {
            if (farmVersion(address) !== FarmVersion.V1_3) {
                continue;
            }

            const [apr] = await Promise.all([
                this.farmComputeV1_3.computeFarmAPR(address),
            ]);
            const cachedKeys = await Promise.all([
                this.farmSetterFactory
                    .useSetter(address)
                    .setFarmAPR(address, apr),
            ]);
            this.invalidatedKeys.push(...cachedKeys);
            await this.deleteCacheKeys();
        }
    }

    @Cron(CronExpression.EVERY_MINUTE)
    async cacheFarmInfo(): Promise<void> {
        const farmsAddresses = await this.farmFactory.getFarmsAddresses();
        for (const farmAddress of farmsAddresses) {
            const [
                minimumFarmingEpochs,
                penaltyPercent,
                rewardsPerBlock,
                state,
                produceRewardsEnabled,
            ] = await Promise.all([
                this.farmAbiFactory
                    .useAbi(farmAddress)
                    .getMinimumFarmingEpochsRaw(farmAddress),
                this.farmAbiFactory
                    .useAbi(farmAddress)
                    .getPenaltyPercentRaw(farmAddress),
                this.farmAbiFactory
                    .useAbi(farmAddress)
                    .getRewardsPerBlockRaw(farmAddress),
                this.farmAbiFactory
                    .useAbi(farmAddress)
                    .getStateRaw(farmAddress),
                this.farmAbiFactory
                    .useAbi(farmAddress)
                    .getProduceRewardsEnabledRaw(farmAddress),
            ]);

            const cacheKeys = await Promise.all([
                this.farmSetterFactory
                    .useSetter(farmAddress)
                    .setMinimumFarmingEpochs(farmAddress, minimumFarmingEpochs),
                this.farmSetterFactory
                    .useSetter(farmAddress)
                    .setPenaltyPercent(farmAddress, penaltyPercent),
                this.farmSetterFactory
                    .useSetter(farmAddress)
                    .setRewardsPerBlock(farmAddress, rewardsPerBlock),
                this.farmSetterFactory
                    .useSetter(farmAddress)
                    .setState(farmAddress, state),
                this.farmSetterFactory
                    .useSetter(farmAddress)
                    .setProduceRewardsEnabled(
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
        const farmsAddresses = await this.farmFactory.getFarmsAddresses();
        for (const farmAddress of farmsAddresses) {
            const [
                farmTokenSupply,
                lastRewardBlockNonce,
                farmRewardPerShare,
                rewardReserve,
            ] = await Promise.all([
                this.farmAbiFactory
                    .useAbi(farmAddress)
                    .getFarmTokenSupplyRaw(farmAddress),
                this.farmAbiFactory
                    .useAbi(farmAddress)
                    .getLastRewardBlockNonceRaw(farmAddress),
                this.farmAbiFactory
                    .useAbi(farmAddress)
                    .getRewardPerShareRaw(farmAddress),
                this.farmAbiFactory
                    .useAbi(farmAddress)
                    .getRewardReserveRaw(farmAddress),
            ]);
            const cacheKeys = await Promise.all([
                this.farmSetterFactory
                    .useSetter(farmAddress)
                    .setFarmTokenSupply(farmAddress, farmTokenSupply),
                this.farmSetterFactory
                    .useSetter(farmAddress)
                    .setLastRewardBlockNonce(farmAddress, lastRewardBlockNonce),
                this.farmSetterFactory
                    .useSetter(farmAddress)
                    .setRewardPerShare(farmAddress, farmRewardPerShare),
                this.farmSetterFactory
                    .useSetter(farmAddress)
                    .setRewardReserve(farmAddress, rewardReserve),
            ]);
            this.invalidatedKeys.push(cacheKeys);
            await this.deleteCacheKeys();
        }
    }

    @Cron(CronExpression.EVERY_30_SECONDS)
    async cacheFarmTokensPrices(): Promise<void> {
        const farmsAddresses = await this.farmFactory.getFarmsAddresses();
        for (const farmAddress of farmsAddresses) {
            const [
                farmedTokenPriceUSD,
                farmingTokenPriceUSD,
                totalValueLockedUSD,
            ] = await Promise.all([
                this.farmComputeFactory
                    .useCompute(farmAddress)
                    .computeFarmedTokenPriceUSD(farmAddress),
                this.farmComputeFactory
                    .useCompute(farmAddress)
                    .computeFarmingTokenPriceUSD(farmAddress),
                this.farmComputeFactory
                    .useCompute(farmAddress)
                    .computeFarmLockedValueUSD(farmAddress),
            ]);
            const cacheKeys = await Promise.all([
                this.farmSetterFactory
                    .useSetter(farmAddress)
                    .setFarmedTokenPriceUSD(farmAddress, farmedTokenPriceUSD),
                this.farmSetterFactory
                    .useSetter(farmAddress)
                    .setFarmingTokenPriceUSD(farmAddress, farmingTokenPriceUSD),
                this.farmSetterFactory
                    .useSetter(farmAddress)
                    .setTotalValueLockedUSD(farmAddress, totalValueLockedUSD),
            ]);
            this.invalidatedKeys.push(cacheKeys);
            await this.deleteCacheKeys();
        }
    }

    private async deleteCacheKeys() {
        await this.pubSub.publish('deleteCacheKeys', this.invalidatedKeys);
        this.invalidatedKeys = [];
    }
}
