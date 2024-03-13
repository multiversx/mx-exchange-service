import { Inject, Injectable } from '@nestjs/common';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { PUB_SUB } from 'src/services/redis.pubSub.module';
import { Logger } from 'winston';
import BigNumber from 'bignumber.js';
import { ClaimProgress } from '../../../submodules/weekly-rewards-splitting/models/weekly-rewards-splitting.model';
import {
    ClaimMultiEvent,
    UpdateGlobalAmountsEvent,
    UpdateUserEnergyEvent,
    WEEKLY_REWARDS_SPLITTING_EVENTS,
} from '@multiversx/sdk-exchange';
import { FarmSetterServiceV2 } from '../../farm/v2/services/farm.v2.setter.service';
import { FeesCollectorSetterService } from '../../fees-collector/services/fees-collector.setter.service';
import { scAddress } from '../../../config';
import { FarmSetterFactory } from '../../farm/farm.setter.factory';
import { UserEnergySetterService } from '../../user/services/userEnergy/user.energy.setter.service';
import { UserEnergyComputeService } from 'src/modules/user/services/userEnergy/user.energy.compute.service';
import { EnergyAbiService } from 'src/modules/energy/services/energy.abi.service';
import { WeeklyRewardsSplittingSetterService } from 'src/submodules/weekly-rewards-splitting/services/weekly.rewarrds.splitting.setter.service';
import { WeeklyRewardsSplittingAbiService } from 'src/submodules/weekly-rewards-splitting/services/weekly-rewards-splitting.abi.service';
import { StakingService } from 'src/modules/staking/services/staking.service';
import { StakingSetterService } from 'src/modules/staking/services/staking.setter.service';

@Injectable()
export class WeeklyRewardsSplittingHandlerService {
    constructor(
        private readonly farmSetter: FarmSetterFactory,
        private readonly feesCollectorSetter: FeesCollectorSetterService,
        private readonly energyAbi: EnergyAbiService,
        private readonly userEnergyCompute: UserEnergyComputeService,
        private readonly userEnergySetter: UserEnergySetterService,
        private readonly weeklyRewardsSplittingAbi: WeeklyRewardsSplittingAbiService,
        private readonly weeklyRewardsSplittingSetter: WeeklyRewardsSplittingSetterService,
        private readonly stakingService: StakingService,
        private readonly stakingSetter: StakingSetterService,
        @Inject(PUB_SUB) private pubSub: RedisPubSub,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async handleUpdateGlobalAmounts(
        event: UpdateGlobalAmountsEvent,
    ): Promise<void> {
        const topics = event.getTopics();

        const keys = await Promise.all([
            this.weeklyRewardsSplittingSetter.totalEnergyForWeek(
                event.address,
                topics.currentWeek,
                topics.totalEnergy,
            ),
            this.weeklyRewardsSplittingSetter.totalLockedTokensForWeek(
                event.address,
                topics.currentWeek,
                topics.totalLockedTokens,
            ),
        ]);

        await this.deleteCacheKeys(keys);
        await this.pubSub.publish(
            WEEKLY_REWARDS_SPLITTING_EVENTS.UPDATE_GLOBAL_AMOUNTS,
            {
                updateGlobalAmountsEvent: event,
            },
        );
    }

    async handleUpdateUserEnergy(event: UpdateUserEnergyEvent): Promise<void> {
        const topics = event.getTopics();
        const userAddress = topics.caller.bech32();
        const contractAddress = event.address;

        const keys = await Promise.all([
            this.weeklyRewardsSplittingSetter.currentClaimProgress(
                contractAddress,
                userAddress,
                new ClaimProgress({
                    energy: topics.energy,
                    week: topics.currentWeek,
                }),
            ),
            this.weeklyRewardsSplittingSetter.userEnergyForWeek(
                contractAddress,
                userAddress,
                topics.currentWeek,
                topics.energy,
            ),
            this.weeklyRewardsSplittingSetter.lastActiveWeekForUser(
                contractAddress,
                userAddress,
                topics.currentWeek,
            ),
        ]);

        const outdatedContract =
            await this.userEnergyCompute.computeUserOutdatedContract(
                userAddress,
                contractAddress,
            );

        keys.push(
            await this.userEnergySetter.setUserOutdatedContract(
                userAddress,
                contractAddress,
                outdatedContract,
            ),
        );

        await this.deleteCacheKeys(keys);
        await this.pubSub.publish(
            WEEKLY_REWARDS_SPLITTING_EVENTS.UPDATE_USER_ENERGY,
            {
                updateUserEnergyEvent: event,
            },
        );
    }

    async handleClaimMulti(event: ClaimMultiEvent): Promise<void> {
        const topics = event.getTopics();

        let totalRewardsForWeek =
            await this.weeklyRewardsSplittingAbi.totalRewardsForWeek(
                event.address,
                topics.currentWeek,
            );

        totalRewardsForWeek = totalRewardsForWeek.map((token) => {
            for (const payment of event.allPayments) {
                if (
                    payment.tokenIdentifier === token.tokenID &&
                    payment.tokenNonce === token.nonce
                ) {
                    token.amount = new BigNumber(token.amount)
                        .minus(payment.amount)
                        .toFixed();
                }
            }
            return token;
        });
        const setter = await this.getSetter(event.address);

        const keys = await Promise.all([
            setter.userRewardsForWeek(
                event.address,
                topics.caller.bech32(),
                topics.currentWeek,
                [],
            ),
            this.weeklyRewardsSplittingSetter.totalRewardsForWeek(
                event.address,
                topics.currentWeek,
                totalRewardsForWeek,
            ),
        ]);

        await this.deleteCacheKeys(keys);
        await this.pubSub.publish(WEEKLY_REWARDS_SPLITTING_EVENTS.CLAIM_MULTI, {
            claimMultiEvent: event,
        });
    }

    private async getSetter(address: string) {
        if (address === scAddress.feesCollector) {
            return this.feesCollectorSetter;
        }

        const stakingAddresses = await this.stakingService.getFarmsStaking();

        if (
            stakingAddresses.find((staking) => staking.address === address) !==
            undefined
        ) {
            return this.stakingSetter;
        }

        return this.farmSetter.useSetter(address) as FarmSetterServiceV2;
    }

    private async deleteCacheKeys(invalidatedKeys: string[]) {
        await this.pubSub.publish('deleteCacheKeys', invalidatedKeys);
    }
}
