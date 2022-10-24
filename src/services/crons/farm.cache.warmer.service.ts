import { Inject, Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AbiFarmService } from 'src/modules/farm/base-module/services/farm.abi.service';
import { ElrondApiService } from '../elrond-communication/elrond-api.service';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { PUB_SUB } from '../redis.pubSub.module';
import { FarmComputeService } from 'src/modules/farm/base-module/services/farm.compute.service';
import { FarmSetterService } from 'src/modules/farm/base-module/services/farm.setter.service';
import { farmsAddresses, farmVersion } from 'src/utils/farm.utils';
import { TokenSetterService } from 'src/modules/tokens/services/token.setter.service';
import { FarmVersion } from 'src/modules/farm/models/farm.model';
import { FarmAbiServiceV1_2 } from 'src/modules/farm/v1.2/services/farm.v1.2.abi.service';
import { FarmComputeServiceV1_2 } from 'src/modules/farm/v1.2/services/farm.v1.2.compute.service';
import { FarmComputeServiceV1_3 } from 'src/modules/farm/v1.3/services/farm.v1.3.compute.service';

@Injectable()
export class FarmCacheWarmerService {
    private invalidatedKeys = [];

    constructor(
        private readonly abiFarm: AbiFarmService,
        private readonly abiFarmV1_2: FarmAbiServiceV1_2,
        private readonly farmComputeV1_2: FarmComputeServiceV1_2,
        private readonly farmComputeV1_3: FarmComputeServiceV1_3,
        private readonly farmSetter: FarmSetterService,
        private readonly farmCompute: FarmComputeService,
        private readonly apiService: ElrondApiService,
        private readonly tokenSetter: TokenSetterService,
        @Inject(PUB_SUB) private pubSub: RedisPubSub,
    ) {}

    @Cron(CronExpression.EVERY_HOUR)
    async cacheFarmsTokens(): Promise<void> {
        const farmsAddress: string[] = farmsAddresses();
        const promises = farmsAddress.map(async (farmAddress) => {
            const [farmTokenID, farmingTokenID, farmedTokenID] =
                await Promise.all([
                    this.abiFarm.getFarmTokenID(farmAddress),
                    this.abiFarm.getFarmingTokenID(farmAddress),
                    this.abiFarm.getFarmedTokenID(farmAddress),
                ]);

            const [farmToken, farmingToken, farmedToken] = await Promise.all([
                this.apiService.getNftCollection(farmTokenID),
                this.apiService.getToken(farmingTokenID),
                this.apiService.getToken(farmedTokenID),
            ]);

            const cacheKeys = await Promise.all([
                this.farmSetter.setFarmTokenID(farmAddress, farmTokenID),
                this.farmSetter.setFarmingTokenID(farmAddress, farmingTokenID),
                this.farmSetter.setFarmedTokenID(farmAddress, farmedTokenID),
                this.tokenSetter.setNftCollectionMetadata(
                    farmTokenID,
                    farmToken,
                ),
                this.tokenSetter.setTokenMetadata(farmingTokenID, farmingToken),
                this.tokenSetter.setTokenMetadata(farmedTokenID, farmedToken),
            ]);
            this.invalidatedKeys.push(cacheKeys);
            await this.deleteCacheKeys();
        });

        await Promise.all(promises);
    }

    @Cron(CronExpression.EVERY_30_SECONDS)
    async cacheFarmsV1_2(): Promise<void> {
        for (const address of farmsAddresses()) {
            if (farmVersion(address) !== FarmVersion.V1_2) {
                continue;
            }
            const [
                aprMultiplier,
                farmingTokenReserve,
                unlockedRewardsAPR,
                lockedRewardsAPR,
            ] = await Promise.all([
                this.abiFarmV1_2.getLockedRewardAprMuliplier(address),
                this.abiFarmV1_2.getFarmingTokenReserve(address),
                this.farmComputeV1_2.computeUnlockedRewardsAPR(address),
                this.farmComputeV1_2.computeLockedRewardsAPR(address),
            ]);

            const cachedKeys = await Promise.all([
                this.farmSetter.setLockedRewardAprMuliplier(
                    address,
                    aprMultiplier,
                ),
                this.farmSetter.setFarmingTokenReserve(
                    address,
                    farmingTokenReserve,
                ),
                this.farmSetter.setUnlockedRewardsAPR(
                    address,
                    unlockedRewardsAPR,
                ),
                this.farmSetter.setLockedRewardsAPR(address, lockedRewardsAPR),
            ]);
            this.invalidatedKeys.push(...cachedKeys);
            await this.deleteCacheKeys();
        }
    }

    @Cron(CronExpression.EVERY_30_SECONDS)
    async cacheFarmsV1_3(): Promise<void> {
        for (const address of farmsAddresses()) {
            if (farmVersion(address) !== FarmVersion.V1_3) {
                continue;
            }

            const [apr] = await Promise.all([
                this.farmComputeV1_3.computeFarmAPR(address),
            ]);
            const cachedKeys = await Promise.all([
                this.farmSetter.setFarmAPR(address, apr),
            ]);
            this.invalidatedKeys.push(...cachedKeys);
            await this.deleteCacheKeys();
        }
    }

    @Cron(CronExpression.EVERY_MINUTE)
    async cacheFarmInfo(): Promise<void> {
        for (const farmAddress of farmsAddresses()) {
            const [
                minimumFarmingEpochs,
                penaltyPercent,
                rewardsPerBlock,
                state,
                produceRewardsEnabled,
            ] = await Promise.all([
                this.abiFarm.getMinimumFarmingEpochs(farmAddress),
                this.abiFarm.getPenaltyPercent(farmAddress),
                this.abiFarm.getRewardsPerBlock(farmAddress),
                this.abiFarm.getState(farmAddress),
                this.abiFarm.getProduceRewardsEnabled(farmAddress),
            ]);

            const cacheKeys = await Promise.all([
                this.farmSetter.setMinimumFarmingEpochs(
                    farmAddress,
                    minimumFarmingEpochs,
                ),
                this.farmSetter.setPenaltyPercent(farmAddress, penaltyPercent),
                this.farmSetter.setRewardsPerBlock(
                    farmAddress,
                    rewardsPerBlock,
                ),
                this.farmSetter.setState(farmAddress, state),
                this.farmSetter.setProduceRewardsEnabled(
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
                farmTokenSupply,
                lastRewardBlockNonce,
                farmRewardPerShare,
                rewardReserve,
            ] = await Promise.all([
                this.abiFarm.getFarmTokenSupply(farmAddress),
                this.abiFarm.getLastRewardBlockNonce(farmAddress),
                this.abiFarm.getRewardPerShare(farmAddress),
                this.abiFarm.getRewardReserve(farmAddress),
            ]);
            const cacheKeys = await Promise.all([
                this.farmSetter.setFarmTokenSupply(
                    farmAddress,
                    farmTokenSupply,
                ),
                this.farmSetter.setLastRewardBlockNonce(
                    farmAddress,
                    lastRewardBlockNonce,
                ),
                this.farmSetter.setRewardPerShare(
                    farmAddress,
                    farmRewardPerShare,
                ),
                this.farmSetter.setRewardReserve(farmAddress, rewardReserve),
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
            ] = await Promise.all([
                this.farmCompute.computeFarmedTokenPriceUSD(farmAddress),
                this.farmCompute.computeFarmingTokenPriceUSD(farmAddress),
                this.farmCompute.computeFarmLockedValueUSD(farmAddress),
            ]);
            const cacheKeys = await Promise.all([
                this.farmSetter.setFarmedTokenPriceUSD(
                    farmAddress,
                    farmedTokenPriceUSD,
                ),
                this.farmSetter.setFarmingTokenPriceUSD(
                    farmAddress,
                    farmingTokenPriceUSD,
                ),
                this.farmSetter.setTotalValueLockedUSD(
                    farmAddress,
                    totalValueLockedUSD,
                ),
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
