import {
    AddLiquidityProxyEvent,
    ClaimRewardsProxyEvent,
    CompoundRewardsProxyEvent,
    EnterFarmProxyEvent,
    ExitFarmProxyEvent,
    PairProxyEvent,
    PROXY_EVENTS,
} from '@multiversx/sdk-exchange';
import { Inject, Injectable } from '@nestjs/common';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { PUB_SUB } from 'src/services/redis.pubSub.module';
import { Logger } from 'winston';

@Injectable()
export class RabbitMQProxyHandlerService {
    constructor(
        @Inject(PUB_SUB) private pubSub: RedisPubSub,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async handleLiquidityProxyEvent(
        event: AddLiquidityProxyEvent | PairProxyEvent,
    ): Promise<void> {
        event.getIdentifier() === PROXY_EVENTS.ADD_LIQUIDITY_PROXY
            ? await this.pubSub.publish(PROXY_EVENTS.ADD_LIQUIDITY_PROXY, {
                  addLiquidityProxyEvent: event,
              })
            : await this.pubSub.publish(PROXY_EVENTS.REMOVE_LIQUIDITY_PROXY, {
                  removeLiquidityProxyEvent: event,
              });
    }

    async handleFarmProxyEvent(
        event: EnterFarmProxyEvent | ExitFarmProxyEvent,
    ): Promise<void> {
        event.getIdentifier() === PROXY_EVENTS.ENTER_FARM_PROXY
            ? await this.pubSub.publish(PROXY_EVENTS.ENTER_FARM_PROXY, {
                  enterFarmProxyEvent: event,
              })
            : await this.pubSub.publish(PROXY_EVENTS.EXIT_FARM_PROXY, {
                  exitFarmProxyEvent: event,
              });
    }

    async handleRewardsProxyEvent(
        event: ClaimRewardsProxyEvent | CompoundRewardsProxyEvent,
    ): Promise<void> {
        event.getIdentifier() === PROXY_EVENTS.CLAIM_REWARDS_PROXY
            ? await this.pubSub.publish(PROXY_EVENTS.CLAIM_REWARDS_PROXY, {
                  claimRewardsProxyEvent: event,
              })
            : await this.pubSub.publish(PROXY_EVENTS.COMPOUND_REWARDS_PROXY, {
                  compoundRewardsProxyEvent: event,
              });
    }
}
