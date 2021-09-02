import { Inject } from '@nestjs/common';
import { Subscription } from '@nestjs/graphql';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { EnterFarmEvent } from './entities/farm/enterFarm.event';
import { ExitFarmEvent } from './entities/farm/exitFarm.event';
import { RewardsEvent } from './entities/farm/rewards.event';
import { AddLiquidityEvent } from './entities/pair/addLiquidity.event';
import { RemoveLiquidityEvent } from './entities/pair/removeLiquidity.event';
import { SwapEvent } from './entities/pair/swap.event';
import { SwapNoFeeEvent } from './entities/pair/swapNoFee.event';
import { AddLiquidityProxyEvent } from './entities/proxy/addLiquidityProxy.event';
import { ClaimRewardsProxyEvent } from './entities/proxy/claimRewardsProxy.event';
import { CompoundRewardsProxyEvent } from './entities/proxy/compoundRewardsProxy.event';
import { EnterFarmProxyEvent } from './entities/proxy/enterFarmProxy.event';
import { ExitFarmProxyEvent } from './entities/proxy/exitFarmProxy.event';
import { PairProxyEvent } from './entities/proxy/pairProxy.event';
import WebSocket from 'ws';
import { PUB_SUB } from 'src/services/redis.pubSub.module';
import { ContextService } from 'src/services/context/context.service';
import { ApiConfigService } from 'src/helpers/api.config.service';
import { farmsConfig, scAddress } from 'src/config';

enum PAIR_EVENTS {
    SWAP = 'swap',
    ADD_LIQUIDITY = 'add_liquidity',
    REMOVE_LIQUIDITY = 'remove_liquidity',
    SWAP_NO_FEE = 'swap_no_fee_and_forward',
}
enum FARM_EVENTS {
    ENTER_FARM = 'enter_farm',
    EXIT_FARM = 'exit_farm',
    CLAIM_REWARDS = 'claim_rewards',
    COMPOUND_REWARDS = 'compound_rewards',
}
enum PROXY_EVENTS {
    ADD_LIQUIDITY_PROXY = 'add_liquidity_proxy',
    REMOVE_LIQUIDITY_PROXY = 'remove_liquidity_proxy',
    ENTER_FARM_PROXY = 'enter_farm_proxy',
    EXIT_FARM_PROXY = 'exit_farm_proxy',
    CLAIM_REWARDS_PROXY = 'claim_rewards_farm_proxy',
    COMPOUND_REWARDS_PROXY = 'compound_rewards_farm_proxy',
}

export class WebSocketResolver {
    private ws: WebSocket;
    private subEvent = {
        subscriptionEntries: [],
    };

    constructor(
        @Inject(PUB_SUB) private pubSub: RedisPubSub,
        private readonly context: ContextService,
        private readonly configService: ApiConfigService,
    ) {
        this.ws = new WebSocket(this.configService.getNotifierUrl());

        this.ws.on('message', message => {
            const rawEvents = JSON.parse(message.toString());
            rawEvents.map(async rawEvent => {
                switch (rawEvent.identifier) {
                    case PAIR_EVENTS.SWAP:
                        const swapEvent = new SwapEvent(rawEvent);
                        console.log({ swapEvent: swapEvent.toJSON() });
                        this.pubSub.publish(PAIR_EVENTS.SWAP, {
                            swapEvent: swapEvent,
                        });
                        break;
                    case PAIR_EVENTS.ADD_LIQUIDITY:
                        const addLiquidityEvent = new AddLiquidityEvent(
                            rawEvent,
                        );
                        console.log({
                            addLiquidityEvent: addLiquidityEvent.toJSON(),
                        });
                        this.pubSub.publish(PAIR_EVENTS.ADD_LIQUIDITY, {
                            addLiquidityEvent: addLiquidityEvent,
                        });
                        break;
                    case PAIR_EVENTS.REMOVE_LIQUIDITY:
                        const removeLiquidityEvent = new RemoveLiquidityEvent(
                            rawEvent,
                        );
                        console.log({
                            removeLiquidityEvent: removeLiquidityEvent.toJSON(),
                        });
                        this.pubSub.publish(PAIR_EVENTS.REMOVE_LIQUIDITY, {
                            removeLiquidityEvent: removeLiquidityEvent,
                        });
                        break;
                    case PAIR_EVENTS.SWAP_NO_FEE:
                        const swapNoFeeAndForwardEvent = new SwapNoFeeEvent(
                            rawEvent,
                        );
                        console.log({
                            swapNoFeeAndForwardEvent: swapNoFeeAndForwardEvent.toJSON(),
                        });
                        this.pubSub.publish(PAIR_EVENTS.SWAP_NO_FEE, {
                            swapNoFeeAndForwardEvent: swapNoFeeAndForwardEvent,
                        });
                        break;
                    case FARM_EVENTS.ENTER_FARM:
                        const enterFarmEvent = new EnterFarmEvent(rawEvent);
                        console.log({
                            enterFarmEvent: enterFarmEvent.toJSON(),
                        });
                        this.pubSub.publish(FARM_EVENTS.ENTER_FARM, {
                            enterFarmEvent: enterFarmEvent,
                        });
                        break;
                    case FARM_EVENTS.EXIT_FARM:
                        const exitFarmEvent = new ExitFarmEvent(rawEvent);
                        console.log({
                            exitFarmEvent: exitFarmEvent.toJSON(),
                        });
                        this.pubSub.publish(FARM_EVENTS.EXIT_FARM, {
                            exitFarmEvent: exitFarmEvent,
                        });
                        break;
                    case FARM_EVENTS.CLAIM_REWARDS:
                        const claimRewardsEvent = new RewardsEvent(rawEvent);
                        console.log({
                            claimRewardsEvent: claimRewardsEvent.toPlainObject(),
                        });
                        this.pubSub.publish(FARM_EVENTS.CLAIM_REWARDS, {
                            claimRewardsEvent: claimRewardsEvent,
                        });
                        break;
                    case FARM_EVENTS.COMPOUND_REWARDS:
                        const compoundRewardsEvent = new RewardsEvent(rawEvent);
                        console.log({
                            compoundRewardsEvent: compoundRewardsEvent.toPlainObject(),
                        });
                        this.pubSub.publish(FARM_EVENTS.COMPOUND_REWARDS, {
                            compoundRewardsEvent: compoundRewardsEvent,
                        });
                        break;
                    case PROXY_EVENTS.ADD_LIQUIDITY_PROXY:
                        const addLiquidityProxyEvent = new AddLiquidityProxyEvent(
                            rawEvent,
                        );
                        console.log({
                            addLiquidityProxyEvent: addLiquidityProxyEvent.toJSON(),
                        });
                        this.pubSub.publish(PROXY_EVENTS.ADD_LIQUIDITY_PROXY, {
                            addLiquidityProxyEvent: addLiquidityProxyEvent,
                        });
                        break;
                    case PROXY_EVENTS.REMOVE_LIQUIDITY_PROXY:
                        const removeLiquidityProxyEvent = new PairProxyEvent(
                            rawEvent,
                        );
                        console.log({
                            removeLiquidityProxyEvent: removeLiquidityProxyEvent.toJSON(),
                        });
                        this.pubSub.publish(
                            PROXY_EVENTS.REMOVE_LIQUIDITY_PROXY,
                            {
                                removeLiquidityProxyEvent: removeLiquidityProxyEvent,
                            },
                        );
                        break;
                    case PROXY_EVENTS.ENTER_FARM_PROXY:
                        const enterFarmProxyEvent = new EnterFarmProxyEvent(
                            rawEvent,
                        );
                        console.log({
                            enterFarmProxyEvent: enterFarmProxyEvent.toJSON(),
                        });
                        this.pubSub.publish(PROXY_EVENTS.ENTER_FARM_PROXY, {
                            enterFarmProxyEvent: enterFarmProxyEvent,
                        });
                        break;
                    case PROXY_EVENTS.EXIT_FARM_PROXY:
                        const exitFarmProxyEvent = new ExitFarmProxyEvent(
                            rawEvent,
                        );
                        console.log({
                            exitFarmProxyEvent: exitFarmProxyEvent.toJSON(),
                        });
                        this.pubSub.publish(PROXY_EVENTS.EXIT_FARM_PROXY, {
                            exitFarmProxyEvent: exitFarmProxyEvent,
                        });
                        break;
                    case PROXY_EVENTS.CLAIM_REWARDS_PROXY:
                        const claimRewardsProxyEvent = new ClaimRewardsProxyEvent(
                            rawEvent,
                        );
                        console.log({
                            claimRewardsProxyEvent: claimRewardsProxyEvent.toJSON(),
                        });
                        this.pubSub.publish(PROXY_EVENTS.CLAIM_REWARDS_PROXY, {
                            claimRewardsProxyEvent: claimRewardsProxyEvent,
                        });
                        break;
                    case PROXY_EVENTS.COMPOUND_REWARDS_PROXY:
                        const compoundRewardsProxyEvent = new CompoundRewardsProxyEvent(
                            rawEvent,
                        );
                        console.log({
                            compoundRewardsProxyEvent: compoundRewardsProxyEvent.toJSON(),
                        });
                        this.pubSub.publish(
                            PROXY_EVENTS.COMPOUND_REWARDS_PROXY,
                            {
                                compoundRewardsProxyEvent: compoundRewardsProxyEvent,
                            },
                        );
                        break;
                }
            });
        });
    }

    async subscribe() {
        const pairsAddress = await this.context.getAllPairsAddress();
        for (const pairAddress of pairsAddress) {
            const pairEvents = Object.values(PAIR_EVENTS);
            pairEvents.map(event =>
                this.subEvent.subscriptionEntries.push({
                    address: pairAddress,
                    identifier: event,
                }),
            );
        }

        for (const farmAddress of farmsConfig) {
            const farmEvents = Object.values(FARM_EVENTS);
            farmEvents.map(event =>
                this.subEvent.subscriptionEntries.push({
                    address: farmAddress,
                    identifier: event,
                }),
            );
        }

        const proxyEvents = Object.values(PROXY_EVENTS);
        proxyEvents.map(event =>
            this.subEvent.subscriptionEntries.push({
                address: scAddress.proxyDexAddress,
                identifier: event,
            }),
        );

        this.ws.send(JSON.stringify(this.subEvent));
    }

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
