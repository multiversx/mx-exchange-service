import { Inject, Injectable } from '@nestjs/common';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { PUB_SUB } from 'src/services/redis.pubSub.module';
import { Logger } from 'winston';
import BigNumber from 'bignumber.js';
import {
    WeeklyRewardsSplittingAbiService
} from '../../../submodules/weekly-rewards-splitting/services/weekly-rewards-splitting.abi.service';
import {
    WeeklyRewardsSplittingSetterService
} from '../../../submodules/weekly-rewards-splitting/services/weekly-rewards-splitting.setter.service';
import {
    WeeklyRewardsSplittingGetterService
} from '../../../submodules/weekly-rewards-splitting/services/weekly-rewards-splitting.getter.service';
import {
    ClaimProgress
} from '../../../submodules/weekly-rewards-splitting/models/weekly-rewards-splitting.model';
import {
    UpdateGlobalAmountsEvent
} from '@elrondnetwork/erdjs-dex/dist/weekly-rewards-splitting/updateGlobalAmounts.event';
import { WEEKLY_REWARDS_SPLITTING_EVENTS } from '@elrondnetwork/erdjs-dex';
import {
    UpdateUserEnergyEvent
} from '@elrondnetwork/erdjs-dex/dist/weekly-rewards-splitting/updateUserEnergy.event';
import {
    ClaimMultiEvent
} from '@elrondnetwork/erdjs-dex/dist/weekly-rewards-splitting/claimMulti.event';

@Injectable()
export class WeeklyRewardsSplittingHandlerService {
    private invalidatedKeys = [];

    constructor(
        private readonly abi: WeeklyRewardsSplittingAbiService,
        private readonly setter: WeeklyRewardsSplittingSetterService,
        private readonly getter: WeeklyRewardsSplittingGetterService,
        @Inject(PUB_SUB) private pubSub: RedisPubSub,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {
    }

    async handleUpdateGlobalAmounts(event: UpdateGlobalAmountsEvent): Promise<void> {
        const topics = event.getTopics();

        const keys = await Promise.all([
            this.setter.totalEnergyForWeek(event.address, topics.currentWeek, topics.totalEnergy),
            this.setter.totalLockedTokensForWeek(event.address, topics.currentWeek, topics.totalLockedTokens),
        ]);

        this.invalidatedKeys.push(keys);
        await this.deleteCacheKeys();
        await this.pubSub.publish(WEEKLY_REWARDS_SPLITTING_EVENTS.UPDATE_GLOBAL_AMOUNTS, {
            updateGlobalAmountsEvent: event,
        });
    }

    async handleUpdateUserEnergy(event: UpdateUserEnergyEvent): Promise<void> {
        const topics = event.getTopics();

        const keys = await Promise.all([
            this.setter.currentClaimProgress(event.address, topics.caller.bech32(), new ClaimProgress({
                    energy: topics.energy,
                    week: topics.currentWeek
                }
            )),
            this.setter.userEnergyForWeek(event.address, topics.caller.bech32(), topics.currentWeek, topics.energy),
            this.setter.lastActiveWeekForUser(event.address, topics.caller.bech32(), topics.currentWeek),
        ]);

        this.invalidatedKeys.push(keys);
        await this.deleteCacheKeys();
        await this.pubSub.publish(WEEKLY_REWARDS_SPLITTING_EVENTS.UPDATE_USER_ENERGY, {
            updateUserEnergyEvent: event,
        });
    }

    async handleClaimMulti(event: ClaimMultiEvent): Promise<void> {
        const topics = event.getTopics();

        let totalRewardsForWeek = await this.getter.totalRewardsForWeek(event.address, topics.currentWeek);

        totalRewardsForWeek = totalRewardsForWeek.map(token => {
            for (const payment of event.allPayments) {
                if (payment.tokenIdentifier === token.tokenID
                    && payment.tokenNonce === token.nonce) {
                    token.amount = new BigNumber(token.amount).minus(payment.amount).toFixed();
                }
            }
            return token;
        })
        const keys = await Promise.all([
            this.setter.userRewardsForWeek(event.address, topics.caller.bech32(), topics.currentWeek, []),
            this.setter.totalRewardsForWeek(event.address, topics.currentWeek, totalRewardsForWeek)
        ]);

        this.invalidatedKeys.push(keys);
        await this.deleteCacheKeys();
        await this.pubSub.publish(WEEKLY_REWARDS_SPLITTING_EVENTS.CLAIM_MULTI, {
            claimMultiEvent: event,
        });
    }

    private async deleteCacheKeys() {
        await this.pubSub.publish('deleteCacheKeys', this.invalidatedKeys);
        this.invalidatedKeys = [];
    }
}
