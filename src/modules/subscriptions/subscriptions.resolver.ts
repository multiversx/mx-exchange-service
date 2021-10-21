import { Inject } from '@nestjs/common';
import { Resolver, Subscription } from '@nestjs/graphql';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { EnterFarmEvent } from '../rabbitmq/entities/farm/enterFarm.event';
import { ExitFarmEvent } from '../rabbitmq/entities/farm/exitFarm.event';
import { RewardsEvent } from '../rabbitmq/entities/farm/rewards.event';
import { AddLiquidityEvent } from '../rabbitmq/entities/pair/addLiquidity.event';
import { RemoveLiquidityEvent } from '../rabbitmq/entities/pair/removeLiquidity.event';
import { SwapFixedInputEvent } from '../rabbitmq/entities/pair/swapFixedInput.event';
import { SwapNoFeeEvent } from '../rabbitmq/entities/pair/swapNoFee.event';
import { AddLiquidityProxyEvent } from '../rabbitmq/entities/proxy/addLiquidityProxy.event';
import { ClaimRewardsProxyEvent } from '../rabbitmq/entities/proxy/claimRewardsProxy.event';
import { CompoundRewardsProxyEvent } from '../rabbitmq/entities/proxy/compoundRewardsProxy.event';
import { EnterFarmProxyEvent } from '../rabbitmq/entities/proxy/enterFarmProxy.event';
import { ExitFarmProxyEvent } from '../rabbitmq/entities/proxy/exitFarmProxy.event';
import { PairProxyEvent } from '../rabbitmq/entities/proxy/pairProxy.event';
import { PUB_SUB } from 'src/services/redis.pubSub.module';
import {
    FARM_EVENTS,
    PAIR_EVENTS,
    PROXY_EVENTS,
} from '../rabbitmq/entities/generic.types';
import { SwapFixedOutputEvent } from '../rabbitmq/entities/pair/swapFixedOutput.event';

@Resolver()
export class SubscriptionsResolver {
    constructor(@Inject(PUB_SUB) private pubSub: RedisPubSub) {}

    @Subscription(() => SwapFixedInputEvent)
    swapFixedInputEvent() {
        return this.pubSub.asyncIterator(PAIR_EVENTS.SWAP_FIXED_INPUT);
    }

    @Subscription(() => SwapFixedOutputEvent)
    swapFixedOutputEvent() {
        return this.pubSub.asyncIterator(PAIR_EVENTS.SWAP_FIXED_OUTPUT);
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
