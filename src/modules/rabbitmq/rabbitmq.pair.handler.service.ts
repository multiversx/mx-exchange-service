import { Inject, Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { PUB_SUB } from 'src/services/redis.pubSub.module';
import { Logger } from 'winston';
import { PairGetterService } from '../pair/services/pair.getter.service';
import { PairSetterService } from '../pair/services/pair.setter.service';
import {
    AddLiquidityEvent,
    PAIR_EVENTS,
    RemoveLiquidityEvent,
    SwapFixedInputEvent,
    SwapFixedOutputEvent,
    SwapNoFeeEvent,
} from '@elrondnetwork/elrond-sdk-erdjs-dex';

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
            event.getTokenIn().tokenID === firstTokenID &&
            event.getTokenOut().tokenID === secondTokenID
        ) {
            firstTokenReserves = event.getTokenInReserves();
            secondTokenReserves = event.getTokenOutReserves();
        } else if (
            event.getTokenOut().tokenID === firstTokenID &&
            event.getTokenIn().tokenID === secondTokenID
        ) {
            firstTokenReserves = event.getTokenOutReserves();
            secondTokenReserves = event.getTokenInReserves();
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

        event.getIdentifier() === PAIR_EVENTS.SWAP_FIXED_INPUT
            ? await this.pubSub.publish(PAIR_EVENTS.SWAP_FIXED_INPUT, {
                  swapFixedInputEvent: event,
              })
            : await this.pubSub.publish(PAIR_EVENTS.SWAP_FIXED_OUTPUT, {
                  swapFixedOutputEvent: event,
              });
    }

    async handleLiquidityEvent(
        event: AddLiquidityEvent | RemoveLiquidityEvent,
    ): Promise<void> {
        const cacheKeys = await Promise.all([
            this.pairSetterService.setFirstTokenReserve(
                event.getAddress(),
                event.getFirstTokenReserves().toFixed(),
            ),
            this.pairSetterService.setSecondTokenReserve(
                event.getAddress(),
                event.getSecondTokenReserves().toFixed(),
            ),
            this.pairSetterService.setTotalSupply(
                event.getAddress(),
                event.getLiquidityPoolSupply().toFixed(),
            ),
        ]);
        this.invalidatedKeys.push(cacheKeys);
        await this.deleteCacheKeys();

        event.getIdentifier() === PAIR_EVENTS.ADD_LIQUIDITY
            ? await this.pubSub.publish(PAIR_EVENTS.ADD_LIQUIDITY, {
                  addLiquidityEvent: event,
              })
            : await this.pubSub.publish(PAIR_EVENTS.REMOVE_LIQUIDITY, {
                  removeLiquidityEvent: event,
              });
    }

    async handleSwapNoFeeEvent(event: SwapNoFeeEvent): Promise<void> {
        await this.pubSub.publish(PAIR_EVENTS.SWAP_NO_FEE, {
            swapNoFeeEvent: event,
        });
    }

    private async deleteCacheKeys() {
        await this.pubSub.publish('deleteCacheKeys', this.invalidatedKeys);
        this.invalidatedKeys = [];
    }
}
