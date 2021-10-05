import { Inject } from '@nestjs/common';
import { EnterFarmEvent } from './entities/farm/enterFarm.event';
import { ExitFarmEvent } from './entities/farm/exitFarm.event';
import { RewardsEvent } from './entities/farm/rewards.event';
import { AddLiquidityEvent } from './entities/pair/addLiquidity.event';
import { RemoveLiquidityEvent } from './entities/pair/removeLiquidity.event';
import { SwapFixedInputEvent } from './entities/pair/swapFixedInput.event';
import { SwapNoFeeEvent } from './entities/pair/swapNoFee.event';
import { AddLiquidityProxyEvent } from './entities/proxy/addLiquidityProxy.event';
import { ClaimRewardsProxyEvent } from './entities/proxy/claimRewardsProxy.event';
import { CompoundRewardsProxyEvent } from './entities/proxy/compoundRewardsProxy.event';
import { EnterFarmProxyEvent } from './entities/proxy/enterFarmProxy.event';
import { ExitFarmProxyEvent } from './entities/proxy/exitFarmProxy.event';
import { PairProxyEvent } from './entities/proxy/pairProxy.event';
import WebSocket from 'ws';
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
import { WebSocketPairHandlerService } from './websocket.pair.handler.service';
import { SwapFixedOutputEvent } from './entities/pair/swapFixedOutput.event';
import { WebSocketFarmHandlerService } from './websocket.farm.handler.service';
import { WebSocketProxyHandlerService } from './websocket.proxy.handler.service';

export class WebSocketService {
    private ws: WebSocket;
    private subEvent = {
        subscriptionEntries: [],
    };

    constructor(
        private readonly context: ContextService,
        private readonly configService: ApiConfigService,
        private readonly wsPairHandler: WebSocketPairHandlerService,
        private readonly wsFarmHandler: WebSocketFarmHandlerService,
        private readonly wsProxyHandler: WebSocketProxyHandlerService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {
        this.ws = new WebSocket(this.configService.getNotifierUrl());

        this.ws.on('message', message => {
            const rawEvents = JSON.parse(message.toString());
            rawEvents.map(async rawEvent => {
                switch (rawEvent.identifier) {
                    case PAIR_EVENTS.SWAP_FIXED_INPUT:
                        await this.wsPairHandler.handleSwapEvent(
                            new SwapFixedInputEvent(rawEvent),
                        );
                        break;
                    case PAIR_EVENTS.SWAP_FIXED_OUTPUT:
                        await this.wsPairHandler.handleSwapEvent(
                            new SwapFixedOutputEvent(rawEvent),
                        );
                        break;
                    case PAIR_EVENTS.ADD_LIQUIDITY:
                        await this.wsPairHandler.handleLiquidityEvent(
                            new AddLiquidityEvent(rawEvent),
                        );
                        break;
                    case PAIR_EVENTS.REMOVE_LIQUIDITY:
                        await this.wsPairHandler.handleLiquidityEvent(
                            new RemoveLiquidityEvent(rawEvent),
                        );
                        break;
                    case PAIR_EVENTS.SWAP_NO_FEE:
                        await this.wsPairHandler.handleSwapNoFeeEvent(
                            new SwapNoFeeEvent(rawEvent),
                        );
                        break;
                    case FARM_EVENTS.ENTER_FARM:
                        await this.wsFarmHandler.handleFarmEvent(
                            new EnterFarmEvent(rawEvent),
                        );
                        break;
                    case FARM_EVENTS.EXIT_FARM:
                        await this.wsFarmHandler.handleFarmEvent(
                            new ExitFarmEvent(rawEvent),
                        );
                        break;
                    case FARM_EVENTS.CLAIM_REWARDS:
                        await this.wsFarmHandler.handleRewardsEvent(
                            new RewardsEvent(rawEvent),
                        );
                        break;
                    case FARM_EVENTS.COMPOUND_REWARDS:
                        await this.wsFarmHandler.handleRewardsEvent(
                            new RewardsEvent(rawEvent),
                        );
                        break;
                    case PROXY_EVENTS.ADD_LIQUIDITY_PROXY:
                        await this.wsProxyHandler.handleLiquidityProxyEvent(
                            new AddLiquidityProxyEvent(rawEvent),
                        );
                        break;
                    case PROXY_EVENTS.REMOVE_LIQUIDITY_PROXY:
                        await this.wsProxyHandler.handleLiquidityProxyEvent(
                            new PairProxyEvent(rawEvent),
                        );
                        break;
                    case PROXY_EVENTS.ENTER_FARM_PROXY:
                        await this.wsProxyHandler.handleFarmProxyEvent(
                            new EnterFarmProxyEvent(rawEvent),
                        );
                        break;
                    case PROXY_EVENTS.EXIT_FARM_PROXY:
                        await this.wsProxyHandler.handleFarmProxyEvent(
                            new ExitFarmProxyEvent(rawEvent),
                        );
                        break;
                    case PROXY_EVENTS.CLAIM_REWARDS_PROXY:
                        await this.wsProxyHandler.handleRewardsProxyEvent(
                            new ClaimRewardsProxyEvent(rawEvent),
                        );
                        break;
                    case PROXY_EVENTS.COMPOUND_REWARDS_PROXY:
                        await this.wsProxyHandler.handleRewardsProxyEvent(
                            new CompoundRewardsProxyEvent(rawEvent),
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
