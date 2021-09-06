import { Inject } from '@nestjs/common';
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
import {
    FARM_EVENTS,
    PAIR_EVENTS,
    PROXY_EVENTS,
} from './entities/generic.types';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

export class WebSocketService {
    private ws: WebSocket;
    private subEvent = {
        subscriptionEntries: [],
    };

    constructor(
        @Inject(PUB_SUB) private pubSub: RedisPubSub,
        private readonly context: ContextService,
        private readonly configService: ApiConfigService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {
        this.ws = new WebSocket(this.configService.getNotifierUrl());

        this.ws.on('message', message => {
            const rawEvents = JSON.parse(message.toString());
            rawEvents.map(async rawEvent => {
                switch (rawEvent.identifier) {
                    case PAIR_EVENTS.SWAP:
                        const swapEvent = new SwapEvent(rawEvent);
                        this.logger.info(JSON.stringify(swapEvent.toJSON()));
                        this.pubSub.publish(PAIR_EVENTS.SWAP, {
                            swapEvent: swapEvent,
                        });
                        break;
                    case PAIR_EVENTS.ADD_LIQUIDITY:
                        const addLiquidityEvent = new AddLiquidityEvent(
                            rawEvent,
                        );
                        this.logger.info(
                            JSON.stringify(addLiquidityEvent.toJSON()),
                        );
                        this.pubSub.publish(PAIR_EVENTS.ADD_LIQUIDITY, {
                            addLiquidityEvent: addLiquidityEvent,
                        });
                        break;
                    case PAIR_EVENTS.REMOVE_LIQUIDITY:
                        const removeLiquidityEvent = new RemoveLiquidityEvent(
                            rawEvent,
                        );
                        this.logger.info(
                            JSON.stringify(removeLiquidityEvent.toJSON()),
                        );
                        this.pubSub.publish(PAIR_EVENTS.REMOVE_LIQUIDITY, {
                            removeLiquidityEvent: removeLiquidityEvent,
                        });
                        break;
                    case PAIR_EVENTS.SWAP_NO_FEE:
                        const swapNoFeeAndForwardEvent = new SwapNoFeeEvent(
                            rawEvent,
                        );
                        this.logger.info(
                            JSON.stringify(swapNoFeeAndForwardEvent.toJSON()),
                        );
                        this.pubSub.publish(PAIR_EVENTS.SWAP_NO_FEE, {
                            swapNoFeeAndForwardEvent: swapNoFeeAndForwardEvent,
                        });
                        break;
                    case FARM_EVENTS.ENTER_FARM:
                        const enterFarmEvent = new EnterFarmEvent(rawEvent);
                        this.logger.info(
                            JSON.stringify(enterFarmEvent.toJSON()),
                        );
                        this.pubSub.publish(FARM_EVENTS.ENTER_FARM, {
                            enterFarmEvent: enterFarmEvent,
                        });
                        break;
                    case FARM_EVENTS.EXIT_FARM:
                        const exitFarmEvent = new ExitFarmEvent(rawEvent);
                        this.logger.info(
                            JSON.stringify(exitFarmEvent.toJSON()),
                        );
                        this.pubSub.publish(FARM_EVENTS.EXIT_FARM, {
                            exitFarmEvent: exitFarmEvent,
                        });
                        break;
                    case FARM_EVENTS.CLAIM_REWARDS:
                        const claimRewardsEvent = new RewardsEvent(rawEvent);
                        this.logger.info(
                            JSON.stringify(claimRewardsEvent.toJSON()),
                        );
                        this.pubSub.publish(FARM_EVENTS.CLAIM_REWARDS, {
                            claimRewardsEvent: claimRewardsEvent,
                        });
                        break;
                    case FARM_EVENTS.COMPOUND_REWARDS:
                        const compoundRewardsEvent = new RewardsEvent(rawEvent);
                        this.logger.info(
                            JSON.stringify(compoundRewardsEvent.toJSON()),
                        );
                        this.pubSub.publish(FARM_EVENTS.COMPOUND_REWARDS, {
                            compoundRewardsEvent: compoundRewardsEvent,
                        });
                        break;
                    case PROXY_EVENTS.ADD_LIQUIDITY_PROXY:
                        const addLiquidityProxyEvent = new AddLiquidityProxyEvent(
                            rawEvent,
                        );
                        this.logger.info(
                            JSON.stringify(addLiquidityProxyEvent.toJSON()),
                        );
                        this.pubSub.publish(PROXY_EVENTS.ADD_LIQUIDITY_PROXY, {
                            addLiquidityProxyEvent: addLiquidityProxyEvent,
                        });
                        break;
                    case PROXY_EVENTS.REMOVE_LIQUIDITY_PROXY:
                        const removeLiquidityProxyEvent = new PairProxyEvent(
                            rawEvent,
                        );
                        this.logger.info(
                            JSON.stringify(removeLiquidityProxyEvent.toJSON()),
                        );
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
                        this.logger.info(
                            JSON.stringify(enterFarmProxyEvent.toJSON()),
                        );
                        this.pubSub.publish(PROXY_EVENTS.ENTER_FARM_PROXY, {
                            enterFarmProxyEvent: enterFarmProxyEvent,
                        });
                        break;
                    case PROXY_EVENTS.EXIT_FARM_PROXY:
                        const exitFarmProxyEvent = new ExitFarmProxyEvent(
                            rawEvent,
                        );
                        this.logger.info(
                            JSON.stringify(exitFarmProxyEvent.toJSON()),
                        );
                        this.pubSub.publish(PROXY_EVENTS.EXIT_FARM_PROXY, {
                            exitFarmProxyEvent: exitFarmProxyEvent,
                        });
                        break;
                    case PROXY_EVENTS.CLAIM_REWARDS_PROXY:
                        const claimRewardsProxyEvent = new ClaimRewardsProxyEvent(
                            rawEvent,
                        );
                        this.logger.info(
                            JSON.stringify(claimRewardsProxyEvent.toJSON()),
                        );
                        this.pubSub.publish(PROXY_EVENTS.CLAIM_REWARDS_PROXY, {
                            claimRewardsProxyEvent: claimRewardsProxyEvent,
                        });
                        break;
                    case PROXY_EVENTS.COMPOUND_REWARDS_PROXY:
                        const compoundRewardsProxyEvent = new CompoundRewardsProxyEvent(
                            rawEvent,
                        );
                        this.logger.info(
                            JSON.stringify(compoundRewardsProxyEvent.toJSON()),
                        );
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
}
