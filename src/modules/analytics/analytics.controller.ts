import {
    AddLiquidityEventType,
    DepositEventType,
    PAIR_EVENTS,
    PRICE_DISCOVERY_EVENTS,
    SwapEventType,
} from '@elrondnetwork/elrond-sdk-erdjs-dex';
import { Controller, Inject } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { AnalyticsEventHandlerService } from './services/analytics.event.handler.service';
import { AnalyticsPriceDiscoveryEventHandlerService } from './services/analytics.price.discovery.event.handler.service';

@Controller()
export class AnalyticsController {
    constructor(
        private readonly eventHandler: AnalyticsEventHandlerService,
        private readonly priceDiscoveryEventHandler: AnalyticsPriceDiscoveryEventHandlerService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    @EventPattern(PAIR_EVENTS.ADD_LIQUIDITY)
    async handleAddLiquidity(
        @Payload() event: { addLiquidityEvent: AddLiquidityEventType },
    ) {
        await this.eventHandler.handleAddLiquidityEvent(
            event.addLiquidityEvent,
        );
    }

    @EventPattern(PAIR_EVENTS.REMOVE_LIQUIDITY)
    async handleRemoveLiquidity(
        @Payload() event: { removeLiquidityEvent: AddLiquidityEventType },
    ) {
        await this.eventHandler.handleAddLiquidityEvent(
            event.removeLiquidityEvent,
        );
    }

    @EventPattern(PAIR_EVENTS.SWAP_FIXED_INPUT)
    async handleSwapFixedInput(
        @Payload() event: { swapFixedInputEvent: SwapEventType },
    ) {
        await this.eventHandler.handleSwapEvents(event.swapFixedInputEvent);
    }

    @EventPattern(PAIR_EVENTS.SWAP_FIXED_OUTPUT)
    async handleSwapFixedOutput(
        @Payload() event: { swapFixedOutputEvent: SwapEventType },
    ) {
        await this.eventHandler.handleSwapEvents(event.swapFixedOutputEvent);
    }

    @EventPattern(PRICE_DISCOVERY_EVENTS.DEPOSIT)
    async handlePriceDiscoveryDepositEvent(
        @Payload() event: { depositEvent: DepositEventType },
    ) {
        await this.priceDiscoveryEventHandler.handleEvent(event.depositEvent);
    }

    @EventPattern(PRICE_DISCOVERY_EVENTS.WITHDARW)
    async handlePriceDiscoveryWithdrawEvent(
        @Payload() event: { withdrawEvent: DepositEventType },
    ) {
        await this.priceDiscoveryEventHandler.handleEvent(event.withdrawEvent);
    }
}
