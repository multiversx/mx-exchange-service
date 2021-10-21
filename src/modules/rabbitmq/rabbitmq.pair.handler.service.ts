import { Inject, Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { PUB_SUB } from 'src/services/redis.pubSub.module';
import { Logger } from 'winston';
import { PairGetterService } from '../pair/services/pair.getter.service';
import { PairSetterService } from '../pair/services/pair.setter.service';
import { PAIR_EVENTS } from './entities/generic.types';
import { AddLiquidityEvent } from './entities/pair/addLiquidity.event';
import { RemoveLiquidityEvent } from './entities/pair/removeLiquidity.event';
import { SwapFixedInputEvent } from './entities/pair/swapFixedInput.event';
import { SwapFixedOutputEvent } from './entities/pair/swapFixedOutput.event';
import { SwapNoFeeEvent } from './entities/pair/swapNoFee.event';

@Injectable()
export class RabbitMQPairHandlerService {
    private invalidatedKeys = [];
    constructor(
        private readonly pairGetterService: PairGetterService,
        private readonly pairSetterService: PairSetterService,
        @Inject(PUB_SUB) private pubSub: RedisPubSub,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async handleSwapEvent(
        event: SwapFixedInputEvent | SwapFixedOutputEvent,
    ): Promise<void> {
        const [firstTokenID, secondTokenID] = await Promise.all([
            this.pairGetterService.getFirstTokenID(event.getAddress()),
            this.pairGetterService.getSecondTokenID(event.getAddress()),
        ]);

        let firstTokenReserves: BigNumber;
        let secondTokenReserves: BigNumber;

        if (
            event.getPairReserves()[0].tokenID === firstTokenID &&
            event.getPairReserves()[1].tokenID === secondTokenID
        ) {
            firstTokenReserves = event.getPairReserves()[0].amount;
            secondTokenReserves = event.getPairReserves()[1].amount;
        } else if (
            event.getPairReserves()[1].tokenID === firstTokenID &&
            event.getPairReserves()[0].tokenID === secondTokenID
        ) {
            firstTokenReserves = event.getPairReserves()[1].amount;
            secondTokenReserves = event.getPairReserves()[0].amount;
        }
        this.invalidatedKeys.push(
            await this.pairSetterService.setFirstTokenReserve(
                event.getAddress(),
                firstTokenReserves.toFixed(),
            ),
        );
        this.invalidatedKeys.push(
            await this.pairSetterService.setSecondTokenReserve(
                event.getAddress(),
                secondTokenReserves.toFixed(),
            ),
        );

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
        const [firstTokenID, secondTokenID] = await Promise.all([
            this.pairGetterService.getFirstTokenID(event.getAddress()),
            this.pairGetterService.getSecondTokenID(event.getAddress()),
        ]);

        let firstTokenReserves: BigNumber;
        let secondTokenReserves: BigNumber;

        if (
            event.getPairReserves()[0].tokenID === firstTokenID &&
            event.getPairReserves()[1].tokenID === secondTokenID
        ) {
            firstTokenReserves = event.getPairReserves()[0].amount;
            secondTokenReserves = event.getPairReserves()[1].amount;
        } else if (
            event.getPairReserves()[1].tokenID === firstTokenID &&
            event.getPairReserves()[0].tokenID === secondTokenID
        ) {
            firstTokenReserves = event.getPairReserves()[1].amount;
            secondTokenReserves = event.getPairReserves()[0].amount;
        }

        const cacheKeys = await Promise.all([
            this.pairSetterService.setFirstTokenReserve(
                event.getAddress(),
                firstTokenReserves.toFixed(),
            ),
            this.pairSetterService.setSecondTokenReserve(
                event.getAddress(),
                secondTokenReserves.toFixed(),
            ),
            this.pairSetterService.setTotalSupply(
                event.getAddress(),
                event.getLiquidityPoolSupply().toFixed(),
            ),
        ]);
        this.invalidatedKeys.push(cacheKeys);

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
        this.pubSub.publish(PAIR_EVENTS.SWAP_NO_FEE, { swapNoFeeEvent: event });
    }

    private async deleteCacheKeys() {
        await this.pubSub.publish('deleteCacheKeys', this.invalidatedKeys);
        this.invalidatedKeys = [];
    }
}
