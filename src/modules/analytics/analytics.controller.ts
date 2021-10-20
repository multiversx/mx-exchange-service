import { Controller, Inject } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { PAIR_EVENTS } from '../rabbitmq/entities/generic.types';
import {
    AddLiquidityEventType,
    SwapEventType,
} from '../rabbitmq/entities/pair/pair.types';
import { AnalyticsEventHandlerService } from './analytics.event.handler.service';

@Controller()
export class AnalyticsController {
    constructor(
        private readonly eventHandler: AnalyticsEventHandlerService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    @EventPattern(PAIR_EVENTS.ADD_LIQUIDITY)
    async handleAddLiquidity(@Payload() event: AddLiquidityEventType) {
        await this.eventHandler.handleAddLiquidityEvent(
            event,
            PAIR_EVENTS.ADD_LIQUIDITY,
        );
    }

    @EventPattern(PAIR_EVENTS.REMOVE_LIQUIDITY)
    async handleRemoveLiquidity(@Payload() event: AddLiquidityEventType) {
        await this.eventHandler.handleAddLiquidityEvent(
            event,
            PAIR_EVENTS.REMOVE_LIQUIDITY,
        );
    }

    @EventPattern(PAIR_EVENTS.SWAP_FIXED_INPUT)
    async handleSwapFixedInput(@Payload() event: SwapEventType) {
        await this.eventHandler.handleSwapEvents(event);
    }

    @EventPattern(PAIR_EVENTS.SWAP_FIXED_OUTPUT)
    async handleSwapFixedOutput(@Payload() event: SwapEventType) {
        await this.eventHandler.handleSwapEvents(event);
    }
}
