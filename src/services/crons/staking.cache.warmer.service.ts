import { Inject, Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { RemoteConfigGetterService } from 'src/modules/remote-config/remote-config.getter.service';
import { AbiStakingService } from 'src/modules/staking/services/staking.abi.service';
import { StakingSetterService } from 'src/modules/staking/services/staking.setter.service';
import { TokenSetterService } from 'src/modules/tokens/services/token.setter.service';
import { ElrondApiService } from '../elrond-communication/elrond-api.service';
import { PUB_SUB } from '../redis.pubSub.module';

@Injectable()
export class StakingCacheWarmerService {
    constructor(
        private readonly abiStakeService: AbiStakingService,
        private readonly stakeSetterService: StakingSetterService,
        private readonly apiService: ElrondApiService,
        private readonly tokenSetter: TokenSetterService,
        private readonly remoteConfigGetterService: RemoteConfigGetterService,
        @Inject(PUB_SUB) private pubSub: RedisPubSub,
    ) {}

    @Cron(CronExpression.EVERY_HOUR)
    async cacheFarmsStaking(): Promise<void> {
        const farmsStakingAddresses =
            await this.remoteConfigGetterService.getStakingAddresses();
        for (const address of farmsStakingAddresses) {
            const [farmTokenID, farmingTokenID, rewardTokenID] =
                await Promise.all([
                    this.abiStakeService.getFarmTokenID(address),
                    this.abiStakeService.getFarmingTokenID(address),
                    this.abiStakeService.getRewardTokenID(address),
                ]);

            const [farmToken, farmingToken, rewardToken] = await Promise.all([
                this.apiService.getNftCollection(farmTokenID),
                this.apiService.getToken(farmingTokenID),
                this.apiService.getToken(rewardTokenID),
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
                this.tokenSetter.setNftCollectionMetadata(
                    farmTokenID,
                    farmToken,
                ),
                this.tokenSetter.setTokenMetadata(farmingTokenID, farmingToken),
                this.tokenSetter.setTokenMetadata(rewardTokenID, rewardToken),
            ]);

            await this.deleteCacheKeys(cacheKeys);
        }
    }

    @Cron(CronExpression.EVERY_MINUTE)
    async cacheStakingInfo(): Promise<void> {
        const farmsStakingAddresses =
            await this.remoteConfigGetterService.getStakingAddresses();
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
        const farmsStakingAddresses =
            await this.remoteConfigGetterService.getStakingAddresses();
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

    private async deleteCacheKeys(invalidatedKeys: string[]) {
        await this.pubSub.publish('deleteCacheKeys', invalidatedKeys);
    }
}
