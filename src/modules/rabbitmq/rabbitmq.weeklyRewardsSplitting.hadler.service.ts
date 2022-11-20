import {
    RawEventType,
    WEEKLY_REWARDS_SPLITTING_EVENTS,
} from '@elrondnetwork/erdjs-dex';
import { Inject, Injectable } from '@nestjs/common';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { PUB_SUB } from 'src/services/redis.pubSub.module';
import { Logger } from 'winston';
import {
    UpdateGlobalAmountsEvent
} from "@elrondnetwork/erdjs-dex/dist/weekly-rewards-splitting/updateGlobalAmounts.event";
import {
    WeeklyRewardsSplittingAbiService
} from "../../submodules/weekly-rewards-splitting/services/weekly-rewards-splitting.abi.service";
import {
    WeeklyRewardsSplittingGetterService
} from "../../submodules/weekly-rewards-splitting/services/weekly-rewards-splitting.getter.service";
import {
    WeeklyRewardsSplittingSetterService
} from "../../submodules/weekly-rewards-splitting/services/weekly-rewards-splitting.setter.service";
import {
    UpdateUserEnergyEvent
} from "@elrondnetwork/erdjs-dex/dist/weekly-rewards-splitting/updateUserEnergy.event";
import {
    ClaimProgress
} from "../../submodules/weekly-rewards-splitting/models/weekly-rewards-splitting.model";
import {
    ClaimMultiEvent
} from "@elrondnetwork/erdjs-dex/dist/weekly-rewards-splitting/claimMulti.event";
import BigNumber from "bignumber.js";

@Injectable()
export class RabbitmqWeeklyRewardsSplittingHadlerService {
    protected invalidatedKeys = [];

    constructor(
        protected readonly abi: WeeklyRewardsSplittingAbiService,
        protected readonly setter: WeeklyRewardsSplittingSetterService,
        protected readonly getter: WeeklyRewardsSplittingGetterService,
        @Inject(PUB_SUB) protected pubSub: RedisPubSub,
        @Inject(WINSTON_MODULE_PROVIDER) protected readonly logger: Logger,
    ) {
    }

    async handleUpdateGlobalAmounts(rawEvent: RawEventType): Promise<void> {
        const event = new UpdateGlobalAmountsEvent(rawEvent);
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

    async handleUpdateUserEnergy(rawEvent: RawEventType): Promise<void> {
        const event = new UpdateUserEnergyEvent(rawEvent);
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

    async handleClaimMulti(rawEvent: RawEventType): Promise<void> {
        const event = new ClaimMultiEvent(rawEvent);
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

    protected async deleteCacheKeys() {
        await this.pubSub.publish('deleteCacheKeys', this.invalidatedKeys);
        this.invalidatedKeys = [];
    }
}
