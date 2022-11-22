import { Inject, Injectable } from '@nestjs/common';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { PUB_SUB } from 'src/services/redis.pubSub.module';
import { Logger } from 'winston';
import {
    FeesCollectorSetterService
} from '../../fees-collector/services/fees-collector.setter.service';
import {
    FeesCollectorGetterService
} from '../../fees-collector/services/fees-collector.getter.service';
import { scAddress } from '../../../config';
import BigNumber from 'bignumber.js';
import {
    DepositSwapFeesEvent,
    FEES_COLLECTOR_EVENTS
} from '@elrondnetwork/erdjs-dex';

@Injectable()
export class FeesCollectorHandlerService {
    private invalidatedKeys = [];

    constructor(
        private readonly setter: FeesCollectorSetterService,
        private readonly getter: FeesCollectorGetterService,
        @Inject(PUB_SUB) private pubSub: RedisPubSub,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {
    }

    async handleDepositSwapFeesEvent(event: DepositSwapFeesEvent): Promise<void> {
        const topics = event.getTopics();
        let cacheKey: string;
        if (topics.payment.tokenNonce) {
            const accumulatedLockedFees = await this.getter.getAccumulatedLockedFees(
                scAddress.feesCollector,
                topics.currentWeek,
                topics.payment.tokenIdentifier
            );
            const updatedAccumulatedLockedFees = accumulatedLockedFees.map(token => {
                if (token.nonce === topics.payment.tokenNonce) {
                    token.amount = new BigNumber(token.amount).plus(topics.payment.amount).toFixed()
                }
                return token
            });
            cacheKey = await this.setter.setAccumulatedLockedFees(
                scAddress.feesCollector,
                topics.currentWeek,
                topics.payment.tokenIdentifier,
                updatedAccumulatedLockedFees
            );
        } else {
            const accumulatedFees = await this.getter.getAccumulatedFees(
                scAddress.feesCollector,
                topics.currentWeek,
                topics.payment.tokenIdentifier
            );
            cacheKey = await this.setter.setAccumulatedFees(
                scAddress.feesCollector,
                topics.currentWeek,
                topics.payment.tokenIdentifier,
                new BigNumber(accumulatedFees).plus(topics.payment.amount).toFixed()
            );
        }

        this.invalidatedKeys.push(cacheKey);
        await this.deleteCacheKeys();
        await this.pubSub.publish(FEES_COLLECTOR_EVENTS.DEPOSIT_SWAP_FEES, {
            depositSwapFeesEvent: event,
        });
    }

    private async deleteCacheKeys() {
        await this.pubSub.publish('deleteCacheKeys', this.invalidatedKeys);
        this.invalidatedKeys = [];
    }
}
