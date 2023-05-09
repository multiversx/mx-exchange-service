import { Inject, Injectable } from '@nestjs/common';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { PUB_SUB } from 'src/services/redis.pubSub.module';
import { Logger } from 'winston';
import { FeesCollectorSetterService } from '../../fees-collector/services/fees-collector.setter.service';
import { scAddress } from '../../../config';
import BigNumber from 'bignumber.js';
import {
    DepositSwapFeesEvent,
    FEES_COLLECTOR_EVENTS,
} from '@multiversx/sdk-exchange';
import { FeesCollectorAbiService } from 'src/modules/fees-collector/services/fees-collector.abi.service';

@Injectable()
export class FeesCollectorHandlerService {
    private invalidatedKeys = [];

    constructor(
        private readonly feesCollectorAbi: FeesCollectorAbiService,
        private readonly feesCollectorSetter: FeesCollectorSetterService,
        @Inject(PUB_SUB) private pubSub: RedisPubSub,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async handleDepositSwapFeesEvent(
        event: DepositSwapFeesEvent,
    ): Promise<void> {
        const topics = event.getTopics();
        const accumulatedFees = await this.feesCollectorAbi.accumulatedFees(
            topics.currentWeek,
            topics.payment.tokenIdentifier,
        );
        const cacheKey = await this.feesCollectorSetter.accumulatedFees(
            topics.currentWeek,
            topics.payment.tokenIdentifier,
            new BigNumber(accumulatedFees)
                .plus(topics.payment.amount)
                .toFixed(),
        );

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
