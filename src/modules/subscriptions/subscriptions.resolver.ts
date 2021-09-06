import { Inject } from '@nestjs/common';
import { Resolver, Subscription } from '@nestjs/graphql';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { EnterFarmEvent } from '../websocket/entities/farm/enterFarm.event';
import { ExitFarmEvent } from '../websocket/entities/farm/exitFarm.event';
import { RewardsEvent } from '../websocket/entities/farm/rewards.event';
import { AddLiquidityEvent } from '../websocket/entities/pair/addLiquidity.event';
import { RemoveLiquidityEvent } from '../websocket/entities/pair/removeLiquidity.event';
import { SwapEvent } from '../websocket/entities/pair/swap.event';
import { SwapNoFeeEvent } from '../websocket/entities/pair/swapNoFee.event';
import { AddLiquidityProxyEvent } from '../websocket/entities/proxy/addLiquidityProxy.event';
import { ClaimRewardsProxyEvent } from '../websocket/entities/proxy/claimRewardsProxy.event';
import { CompoundRewardsProxyEvent } from '../websocket/entities/proxy/compoundRewardsProxy.event';
import { EnterFarmProxyEvent } from '../websocket/entities/proxy/enterFarmProxy.event';
import { ExitFarmProxyEvent } from '../websocket/entities/proxy/exitFarmProxy.event';
import { PairProxyEvent } from '../websocket/entities/proxy/pairProxy.event';
import { PUB_SUB } from 'src/services/redis.pubSub.module';
import {
    FARM_EVENTS,
    PAIR_EVENTS,
    PROXY_EVENTS,
} from '../websocket/entities/generic.types';

@Resolver()
export class SubscriptionsResolver {
    constructor(@Inject(PUB_SUB) private pubSub: RedisPubSub) {}

    @Subscription(() => SwapEvent)
    swapEvent() {
        return this.pubSub.asyncIterator(PAIR_EVENTS.SWAP);
    }

    @Subscription(() => AddLiquidityEvent)
    addLiquidityEvent() {
        return this.pubSub.asyncIterator(PAIR_EVENTS.ADD_LIQUIDITY);
    }

    @Subscription(() => RemoveLiquidityEvent)
    removeLiquidityEvent() {
        return this.pubSub.asyncIterator(PAIR_EVENTS.REMOVE_LIQUIDITY);
    }

    @Subscription(() => SwapNoFeeEvent)
    swapNoFeeEvent() {
        return this.pubSub.asyncIterator(PAIR_EVENTS.SWAP_NO_FEE);
    }

    @Subscription(() => EnterFarmEvent)
    enterFarmEvent() {
        return this.pubSub.asyncIterator(FARM_EVENTS.ENTER_FARM);
    }

    @Subscription(() => ExitFarmEvent)
    exitFarmEvent() {
        return this.pubSub.asyncIterator(FARM_EVENTS.EXIT_FARM);
    }

    @Subscription(() => RewardsEvent)
    claimRewardsEvent() {
        return this.pubSub.asyncIterator(FARM_EVENTS.CLAIM_REWARDS);
    }

    @Subscription(() => RewardsEvent)
    compoundRewardsEvent() {
        return this.pubSub.asyncIterator(FARM_EVENTS.COMPOUND_REWARDS);
    }

    @Subscription(() => AddLiquidityProxyEvent)
    addLiquidityProxyEvent() {
        return this.pubSub.asyncIterator(PROXY_EVENTS.ADD_LIQUIDITY_PROXY);
    }

    @Subscription(() => PairProxyEvent)
    removeLiquidityProxyEvent() {
        return this.pubSub.asyncIterator(PROXY_EVENTS.REMOVE_LIQUIDITY_PROXY);
    }

    @Subscription(() => EnterFarmProxyEvent)
    enterFarmProxyEvent() {
        return this.pubSub.asyncIterator(PROXY_EVENTS.ENTER_FARM_PROXY);
    }

    @Subscription(() => ExitFarmProxyEvent)
    exitFarmProxyEvent() {
        return this.pubSub.asyncIterator(PROXY_EVENTS.EXIT_FARM_PROXY);
    }

    @Subscription(() => ClaimRewardsProxyEvent)
    claimRewardsProxyEvent() {
        return this.pubSub.asyncIterator(PROXY_EVENTS.CLAIM_REWARDS_PROXY);
    }

    @Subscription(() => CompoundRewardsProxyEvent)
    compoundRewardsProxyEvent() {
        return this.pubSub.asyncIterator(PROXY_EVENTS.COMPOUND_REWARDS_PROXY);
    }
}
