import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { RabbitMQPairHandlerService } from './rabbitmq.pair.handler.service';
import { RabbitMQFarmHandlerService } from './rabbitmq.farm.handler.service';
import { RabbitMQProxyHandlerService } from './rabbitmq.proxy.handler.service';
import { CompetingRabbitConsumer } from './rabbitmq.consumers';
import { scAddress } from 'src/config';
import { ContextService } from 'src/services/context/context.service';
import { RabbitMQEsdtTokenHandlerService } from './rabbitmq.esdtToken.handler.service';
import { farmsAddresses, farmVersion } from 'src/utils/farm.utils';
import { RabbitMQRouterHandlerService } from './rabbitmq.router.handler.service';
import { RabbitMQMetabondingHandlerService } from './rabbitmq.metabonding.handler.service';
import { RabbitMqPriceDiscoveryHandlerService } from './rabbitmq.price.discovery.handler.service';
import {
    AddLiquidityEvent,
    AddLiquidityProxyEvent,
    ClaimRewardsProxyEvent,
    CompoundRewardsProxyEvent,
    CreatePairEvent,
    DepositEvent,
    EnterFarmEvent,
    EnterFarmProxyEvent,
    EsdtLocalBurnEvent,
    EsdtLocalMintEvent,
    ESDT_EVENTS,
    ExitFarmEvent,
    ExitFarmProxyEvent,
    FARM_EVENTS,
    MetabondingEvent,
    METABONDING_EVENTS,
    PairProxyEvent,
    PAIR_EVENTS,
    PRICE_DISCOVERY_EVENTS,
    PROXY_EVENTS,
    RemoveLiquidityEvent,
    RewardsEvent,
    ROUTER_EVENTS,
    SwapFixedInputEvent,
    SwapFixedOutputEvent,
    WithdrawEvent,
    RawEvent,
    PairSwapEnabledEvent,
} from '@elrondnetwork/erdjs-dex';

@Injectable()
export class RabbitMqConsumer {
    private filterAddresses: string[];

    constructor(
        private readonly context: ContextService,
        private readonly wsPairHandler: RabbitMQPairHandlerService,
        private readonly wsFarmHandler: RabbitMQFarmHandlerService,
        private readonly wsProxyHandler: RabbitMQProxyHandlerService,
        private readonly wsRouterHandler: RabbitMQRouterHandlerService,
        private readonly wsEsdtTokenHandler: RabbitMQEsdtTokenHandlerService,
        private readonly wsMetabondingHandler: RabbitMQMetabondingHandlerService,
        private readonly wsPriceDiscoveryHandler: RabbitMqPriceDiscoveryHandlerService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    @CompetingRabbitConsumer({
        queueName: process.env.RABBITMQ_QUEUE,
        exchange: process.env.RABBITMQ_EXCHANGE,
    })
    async consumeEvents(rawEvents: any) {
        if (!rawEvents.events) {
            return;
        }
        const events: RawEvent[] = rawEvents?.events?.filter(
            (rawEvent: { address: string; identifier: string }) =>
                this.filterAddresses.find(
                    filterAddress =>
                        rawEvent.address === filterAddress ||
                        rawEvent.identifier === ESDT_EVENTS.ESDT_LOCAL_BURN ||
                        rawEvent.identifier === ESDT_EVENTS.ESDT_LOCAL_MINT,
                ) !== undefined,
        );

        for (const rawEvent of events) {
            if (
                rawEvent.data === '' &&
                rawEvent.identifier !== METABONDING_EVENTS.UNBOND
            ) {
                continue;
            }
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
                case FARM_EVENTS.ENTER_FARM:
                    await this.wsFarmHandler.handleFarmEvent(
                        new EnterFarmEvent(
                            farmVersion(rawEvent.address),
                            rawEvent,
                        ),
                    );
                    break;
                case FARM_EVENTS.EXIT_FARM:
                    await this.wsFarmHandler.handleFarmEvent(
                        new ExitFarmEvent(
                            farmVersion(rawEvent.address),
                            rawEvent,
                        ),
                    );
                    break;
                case FARM_EVENTS.CLAIM_REWARDS:
                    await this.wsFarmHandler.handleRewardsEvent(
                        new RewardsEvent(
                            farmVersion(rawEvent.address),
                            rawEvent,
                        ),
                    );
                    break;
                case FARM_EVENTS.COMPOUND_REWARDS:
                    await this.wsFarmHandler.handleRewardsEvent(
                        new RewardsEvent(
                            farmVersion(rawEvent.address),
                            rawEvent,
                        ),
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
                case ESDT_EVENTS.ESDT_LOCAL_MINT:
                    await this.wsEsdtTokenHandler.handleEsdtTokenEvent(
                        new EsdtLocalMintEvent(rawEvent),
                    );
                    break;
                case ESDT_EVENTS.ESDT_LOCAL_BURN:
                    await this.wsEsdtTokenHandler.handleEsdtTokenEvent(
                        new EsdtLocalBurnEvent(rawEvent),
                    );
                    break;
                case ROUTER_EVENTS.CREATE_PAIR:
                    await this.wsRouterHandler.handleCreatePairEvent(
                        new CreatePairEvent(rawEvent),
                    );
                    await this.getFilterAddresses();
                    break;
                case ROUTER_EVENTS.PAIR_SWAP_ENABLED:
                    await this.wsRouterHandler.handlePairSwapEnabled(
                        new PairSwapEnabledEvent(rawEvent),
                    );
                    break;
                case METABONDING_EVENTS.STAKE_LOCKED_ASSET:
                    await this.wsMetabondingHandler.handleMetabondingEvent(
                        new MetabondingEvent(rawEvent),
                    );
                    break;
                case METABONDING_EVENTS.UNSTAKE:
                    await this.wsMetabondingHandler.handleMetabondingEvent(
                        new MetabondingEvent(rawEvent),
                    );
                    break;
                case METABONDING_EVENTS.UNBOND:
                    await this.wsMetabondingHandler.handleMetabondingEvent(
                        new MetabondingEvent(rawEvent),
                    );
                    break;
                case PRICE_DISCOVERY_EVENTS.DEPOSIT:
                    await this.wsPriceDiscoveryHandler.handleEvent(
                        new DepositEvent(rawEvent),
                    );
                    break;
                case PRICE_DISCOVERY_EVENTS.WITHDARW:
                    await this.wsPriceDiscoveryHandler.handleEvent(
                        new WithdrawEvent(rawEvent),
                    );
                    break;
            }
        }
    }

    async getFilterAddresses(): Promise<void> {
        this.filterAddresses = [];
        this.filterAddresses = await this.context.getAllPairsAddress();
        this.filterAddresses.push(...farmsAddresses());
        this.filterAddresses.push(scAddress.proxyDexAddress);
        this.filterAddresses.push(scAddress.routerAddress);
        this.filterAddresses.push(scAddress.metabondingStakingAddress);
        this.filterAddresses.push(...scAddress.priceDiscovery);
    }
}
