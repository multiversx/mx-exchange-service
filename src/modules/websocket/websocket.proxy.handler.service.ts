import { Inject, Injectable } from '@nestjs/common';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { PUB_SUB } from 'src/services/redis.pubSub.module';
import { Logger } from 'winston';
import { PROXY_EVENTS } from './entities/generic.types';
import { AddLiquidityProxyEvent } from './entities/proxy/addLiquidityProxy.event';
import { ClaimRewardsProxyEvent } from './entities/proxy/claimRewardsProxy.event';
import { CompoundRewardsProxyEvent } from './entities/proxy/compoundRewardsProxy.event';
import { EnterFarmProxyEvent } from './entities/proxy/enterFarmProxy.event';
import { ExitFarmProxyEvent } from './entities/proxy/exitFarmProxy.event';
import { PairProxyEvent } from './entities/proxy/pairProxy.event';

@Injectable()
export class WebSocketProxyHandlerService {
    constructor(
        @Inject(PUB_SUB) private pubSub: RedisPubSub,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async handleLiquidityProxyEvent(
        event: AddLiquidityProxyEvent | PairProxyEvent,
    ): Promise<void> {
        event instanceof AddLiquidityProxyEvent
            ? this.pubSub.publish(PROXY_EVENTS.ADD_LIQUIDITY_PROXY, {
                  addLiquidityProxyEvent: event,
              })
            : this.pubSub.publish(PROXY_EVENTS.REMOVE_LIQUIDITY_PROXY, {
                  removeLiquidityProxyEvent: event,
              });
    }

    async handleFarmProxyEvent(
        event: EnterFarmProxyEvent | ExitFarmProxyEvent,
    ): Promise<void> {
        event instanceof EnterFarmProxyEvent
            ? this.pubSub.publish(PROXY_EVENTS.ENTER_FARM_PROXY, {
                  enterFarmProxyEvent: event,
              })
            : this.pubSub.publish(PROXY_EVENTS.EXIT_FARM_PROXY, {
                  exitFarmProxyEvent: event,
              });
    }

    async handleRewardsProxyEvent(
        event: ClaimRewardsProxyEvent | CompoundRewardsProxyEvent,
    ): Promise<void> {
        event instanceof ClaimRewardsProxyEvent
            ? this.pubSub.publish(PROXY_EVENTS.CLAIM_REWARDS_PROXY, {
                  claimRewardsProxyEvent: event,
              })
            : this.pubSub.publish(PROXY_EVENTS.COMPOUND_REWARDS_PROXY, {
                  compoundRewardsProxyEvent: event,
              });
    }
}
