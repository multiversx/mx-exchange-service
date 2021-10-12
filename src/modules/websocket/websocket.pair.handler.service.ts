import { Inject, Injectable } from '@nestjs/common';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { PUB_SUB } from 'src/services/redis.pubSub.module';
import { Logger } from 'winston';
import { PairSetterService } from '../pair/services/pair.setter.service';
import { PAIR_EVENTS } from './entities/generic.types';
import { AddLiquidityEvent } from './entities/pair/addLiquidity.event';
import { RemoveLiquidityEvent } from './entities/pair/removeLiquidity.event';
import { SwapFixedInputEvent } from './entities/pair/swapFixedInput.event';
import { SwapFixedOutputEvent } from './entities/pair/swapFixedOutput.event';
import { SwapNoFeeEvent } from './entities/pair/swapNoFee.event';

@Injectable()
export class WebSocketPairHandlerService {
    private invalidatedKeys = [];
    constructor(
        private readonly pairSetterService: PairSetterService,
        @Inject(PUB_SUB) private pubSub: RedisPubSub,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async handleSwapEvent(
        event: SwapFixedInputEvent | SwapFixedOutputEvent,
    ): Promise<void> {
        this.invalidatedKeys.push(
            await this.pairSetterService.setFirstTokenReserve(
                event.getAddress(),
                event.getPairReserves()[0].amount.toFixed(),
            ),
        );
        this.invalidatedKeys.push(
            await this.pairSetterService.setSecondTokenReserve(
                event.getAddress(),
                event.getPairReserves()[1].amount.toFixed(),
            ),
        );
        await this.deleteCacheKeys();

        event instanceof SwapFixedInputEvent
            ? this.pubSub.publish(PAIR_EVENTS.SWAP_FIXED_INPUT, event)
            : this.pubSub.publish(PAIR_EVENTS.SWAP_FIXED_OUTPUT, event);
    }

    async handleLiquidityEvent(
        event: AddLiquidityEvent | RemoveLiquidityEvent,
    ): Promise<void> {
        const cacheKeys = await Promise.all([
            this.pairSetterService.setFirstTokenReserve(
                event.getAddress(),
                event.getPairReserves()[0].amount.toFixed(),
            ),
            this.pairSetterService.setSecondTokenReserve(
                event.getAddress(),
                event.getPairReserves()[1].amount.toFixed(),
            ),
            this.pairSetterService.setTotalSupply(
                event.getAddress(),
                event.getLiquidityPoolSupply().toFixed(),
            ),
        ]);
        this.invalidatedKeys.push(cacheKeys);

        await this.deleteCacheKeys();
        event instanceof AddLiquidityEvent
            ? this.pubSub.publish(PAIR_EVENTS.ADD_LIQUIDITY, event)
            : this.pubSub.publish(PAIR_EVENTS.REMOVE_LIQUIDITY, event);
    }

    async handleSwapNoFeeEvent(event: SwapNoFeeEvent): Promise<void> {
        this.pubSub.publish(PAIR_EVENTS.SWAP_NO_FEE, event);
    }

    private async deleteCacheKeys() {
        await this.pubSub.publish('deleteCacheKeys', this.invalidatedKeys);
        this.invalidatedKeys = [];
    }
}
