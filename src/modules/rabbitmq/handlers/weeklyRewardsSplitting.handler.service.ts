import { Inject, Injectable } from '@nestjs/common';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { PUB_SUB } from 'src/services/redis.pubSub.module';
import { Logger } from 'winston';
import BigNumber from 'bignumber.js';
import {
    ClaimProgress
} from '../../../submodules/weekly-rewards-splitting/models/weekly-rewards-splitting.model';
import {
    ClaimMultiEvent,
    UpdateGlobalAmountsEvent,
    UpdateUserEnergyEvent,
    WEEKLY_REWARDS_SPLITTING_EVENTS,
} from '@elrondnetwork/erdjs-dex';
import {
    FarmSetterServiceV2
} from '../../farm/v2/services/farm.v2.setter.service';
import {
    FarmGetterServiceV2
} from '../../farm/v2/services/farm.v2.getter.service';
import {
    FeesCollectorSetterService
} from '../../fees-collector/services/fees-collector.setter.service';
import {
    FeesCollectorGetterService
} from '../../fees-collector/services/fees-collector.getter.service';
import { scAddress } from '../../../config';
import { FarmSetterFactory } from '../../farm/farm.setter.factory';
import { FarmGetterFactory } from '../../farm/farm.getter.factory';
import {
    UserEnergySetterService
} from '../../user/services/userEnergy/user.energy.setter.service';
import {
    UserEnergyGetterService
} from '../../user/services/userEnergy/user.energy.getter.service';
import { OutdatedContract } from '../../user/models/user.model';

@Injectable()
export class WeeklyRewardsSplittingHandlerService {
    private invalidatedKeys = [];

    constructor(
        private readonly farmSetter: FarmSetterFactory,
        private readonly farmGetter: FarmGetterFactory,
        private readonly feesCollectorSetter: FeesCollectorSetterService,
        private readonly feesCollectorGetter: FeesCollectorGetterService,
        private readonly userEnergyGetter: UserEnergyGetterService,
        private readonly userEnergySetter: UserEnergySetterService,
        @Inject(PUB_SUB) private pubSub: RedisPubSub,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {
    }

    async handleUpdateGlobalAmounts(event: UpdateGlobalAmountsEvent): Promise<void> {
        const topics = event.getTopics();

        const keys = await Promise.all([
            this.getSetter(event.address).totalEnergyForWeek(event.address, topics.currentWeek, topics.totalEnergy),
            this.getSetter(event.address).totalLockedTokensForWeek(event.address, topics.currentWeek, topics.totalLockedTokens),
        ]);

        this.invalidatedKeys.push(keys);
        await this.deleteCacheKeys();
        await this.pubSub.publish(WEEKLY_REWARDS_SPLITTING_EVENTS.UPDATE_GLOBAL_AMOUNTS, {
            updateGlobalAmountsEvent: event,
        });
    }

    async handleUpdateUserEnergy(event: UpdateUserEnergyEvent): Promise<void> {
        const topics = event.getTopics();

        let userOutdatedContracts = await this.userEnergyGetter.getUserOutdatedContracts(topics.caller.bech32())
        userOutdatedContracts = userOutdatedContracts.filter((item: OutdatedContract) => item.address != event.address)
        const keys = await Promise.all([
            this.getSetter(event.address).currentClaimProgress(event.address, topics.caller.bech32(), new ClaimProgress({
                    energy: topics.energy,
                    week: topics.currentWeek
                }
            )),
            this.getSetter(event.address).userEnergyForWeek(event.address, topics.caller.bech32(), topics.currentWeek, topics.energy),
            this.getSetter(event.address).lastActiveWeekForUser(event.address, topics.caller.bech32(), topics.currentWeek),
            this.userEnergySetter.setUserOutdatedContracts(topics.caller.bech32(), userOutdatedContracts),
        ]);

        this.invalidatedKeys.push(keys);
        await this.deleteCacheKeys();
        await this.pubSub.publish(WEEKLY_REWARDS_SPLITTING_EVENTS.UPDATE_USER_ENERGY, {
            updateUserEnergyEvent: event,
        });
    }

    async handleClaimMulti(event: ClaimMultiEvent): Promise<void> {
        const topics = event.getTopics();

        let totalRewardsForWeek = await this.getGetter(event.address).totalRewardsForWeek(event.address, topics.currentWeek);

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
            this.getSetter(event.address).userRewardsForWeek(event.address, topics.caller.bech32(), topics.currentWeek, []),
            this.getSetter(event.address).totalRewardsForWeek(event.address, topics.currentWeek, totalRewardsForWeek)
        ]);

        this.invalidatedKeys.push(keys);
        await this.deleteCacheKeys();
        await this.pubSub.publish(WEEKLY_REWARDS_SPLITTING_EVENTS.CLAIM_MULTI, {
            claimMultiEvent: event,
        });
    }

    private getSetter(address: string) {
        if (address === scAddress.feesCollector) {
            return this.feesCollectorSetter
        }
        return (this.farmSetter.useSetter(address) as FarmSetterServiceV2)
    }

    private getGetter(address: string) {
        if (address === scAddress.feesCollector) {
            return this.feesCollectorGetter
        }
        return (this.farmGetter.useGetter(address) as FarmGetterServiceV2)
    }

    private async deleteCacheKeys() {
        await this.pubSub.publish('deleteCacheKeys', this.invalidatedKeys);
        this.invalidatedKeys = [];
    }
}
