import { Inject, Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { RemoteConfigGetterService } from 'src/modules/remote-config/remote-config.getter.service';
import { StakingAbiService } from 'src/modules/staking/services/staking.abi.service';
import { StakingComputeService } from 'src/modules/staking/services/staking.compute.service';
import { StakingSetterService } from 'src/modules/staking/services/staking.setter.service';
import { PUB_SUB } from '../redis.pubSub.module';

@Injectable()
export class StakingCacheWarmerService {
    constructor(
        private readonly stakingAbi: StakingAbiService,
        private readonly stakeSetterService: StakingSetterService,
        private readonly stakeCompute: StakingComputeService,
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
                    this.stakingAbi.getFarmTokenIDRaw(address),
                    this.stakingAbi.getFarmingTokenIDRaw(address),
                    this.stakingAbi.getRewardTokenIDRaw(address),
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
                divisionSafetyConstant,
                state,
                boostedYieldsFactors,
                apr,
            ] = await Promise.all([
                this.stakingAbi.getAnnualPercentageRewardsRaw(address),
                this.stakingAbi.getMinUnbondEpochsRaw(address),
                this.stakingAbi.getDivisionSafetyConstantRaw(address),
                this.stakingAbi.getStateRaw(address),
                this.stakingAbi.getBoostedYieldsFactorsRaw(address),
                this.stakeCompute.computeStakeFarmAPR(address),
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
                this.stakeSetterService.setDivisionSafetyConstant(
                    address,
                    divisionSafetyConstant,
                ),
                this.stakeSetterService.setState(address, state),
                this.stakeSetterService.setBoostedYieldsFactors(
                    address,
                    boostedYieldsFactors,
                ),
                this.stakeSetterService.setStakeFarmAPR(address, apr),
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
                this.stakingAbi.getFarmTokenSupplyRaw(address),
                this.stakingAbi.getRewardPerShareRaw(address),
                this.stakingAbi.getAccumulatedRewardsRaw(address),
                this.stakingAbi.getRewardCapacityRaw(address),
                this.stakingAbi.getPerBlockRewardsAmountRaw(address),
                this.stakingAbi.getLastRewardBlockNonceRaw(address),
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
        invalidatedKeys = invalidatedKeys.filter((key) => key !== undefined);

        if (invalidatedKeys.length === 0) {
            return;
        }

        await this.pubSub.publish('deleteCacheKeys', invalidatedKeys);
    }
}
