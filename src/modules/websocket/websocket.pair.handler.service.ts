import { Inject, Injectable } from '@nestjs/common';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { PUB_SUB } from 'src/services/redis.pubSub.module';
import { Logger } from 'winston';
import { PairComputeService } from '../pair/services/pair.compute.service';
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
        private readonly pairComputeService: PairComputeService,
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
        const [
            firstTokenPrice,
            secondTokenPrice,
            firstTokenPriceUSD,
            secondTokenPriceUSD,
            lpTokenPriceUSD,
        ] = await Promise.all([
            this.pairComputeService.computeFirstTokenPrice(event.getAddress()),
            this.pairComputeService.computeSecondTokenPrice(event.getAddress()),
            this.pairComputeService.computeTokenPriceUSD(
                event.getPairReserves()[0].tokenID,
            ),
            this.pairComputeService.computeTokenPriceUSD(
                event.getPairReserves()[1].tokenID,
            ),
            this.pairComputeService.computeLpTokenPriceUSD(event.getAddress()),
        ]);
        const cacheKeys = await Promise.all([
            this.pairSetterService.setFirstTokenPrice(
                event.getAddress(),
                firstTokenPrice,
            ),
            this.pairSetterService.setSecondTokenPrice(
                event.getAddress(),
                secondTokenPrice,
            ),
            this.pairSetterService.setFirstTokenPriceUSD(
                event.getAddress(),
                firstTokenPriceUSD.toFixed(),
            ),
            this.pairSetterService.setSecondTokenPriceUSD(
                event.getAddress(),
                secondTokenPriceUSD.toFixed(),
            ),
            this.pairSetterService.setLpTokenPriceUSD(
                event.getAddress(),
                lpTokenPriceUSD,
            ),
        ]);
        this.invalidatedKeys.push(cacheKeys);
        await this.deleteCacheKeys();
        event instanceof SwapFixedInputEvent
            ? this.pubSub.publish(PAIR_EVENTS.SWAP_FIXED_INPUT, {
                  swapFixedInputEvent: event,
              })
            : this.pubSub.publish(PAIR_EVENTS.SWAP_FIXED_OUTPUT, {
                  swapFixedOutputEvent: event,
              });
    }

    async handleLiquidityEvent(
        event: AddLiquidityEvent | RemoveLiquidityEvent,
    ): Promise<void> {
        this.invalidatedKeys = await Promise.all([
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

        await this.deleteCacheKeys();
        event instanceof AddLiquidityEvent
            ? this.pubSub.publish(PAIR_EVENTS.ADD_LIQUIDITY, {
                  addLiquidityEvent: event,
              })
            : this.pubSub.publish(PAIR_EVENTS.REMOVE_LIQUIDITY, {
                  removeLiquidityEvent: event,
              });
    }

    async handleSwapNoFeeEvent(event: SwapNoFeeEvent): Promise<void> {
        this.pubSub.publish(PAIR_EVENTS.SWAP_NO_FEE, {
            swapNoFeeAndForwardEvent: event,
        });
    }

    private async deleteCacheKeys() {
        await this.pubSub.publish('deleteCacheKeys', this.invalidatedKeys);
        this.invalidatedKeys = [];
    }
}
