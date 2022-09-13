import { Inject, Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { PUB_SUB } from 'src/services/redis.pubSub.module';
import { computeValueUSD } from 'src/utils/token.converters';
import { Logger } from 'winston';
import { PairComputeService } from '../../pair/services/pair.compute.service';
import { PairGetterService } from '../../pair/services/pair.getter.service';
import { PairSetterService } from '../../pair/services/pair.setter.service';
import {
    PAIR_EVENTS,
    SwapFixedInputEvent,
    SwapFixedOutputEvent,
    SwapNoFeeEvent,
} from '@elrondnetwork/erdjs-dex';
import { PairHandler } from './pair.handler.service';
import { RouterComputeService } from 'src/modules/router/services/router.compute.service';

@Injectable()
export class SwapEventHandler {
    constructor(
        private readonly pairGetter: PairGetterService,
        private readonly pairSetter: PairSetterService,
        private readonly pairCompute: PairComputeService,
        private readonly routerCompute: RouterComputeService,
        private readonly pairHandler: PairHandler,
        @Inject(PUB_SUB) private pubSub: RedisPubSub,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async handleSwapEvents(
        event: SwapFixedInputEvent | SwapFixedOutputEvent,
    ): Promise<[any[], number]> {
        const [firstToken, secondToken] = await Promise.all([
            this.pairGetter.getFirstToken(event.address),
            this.pairGetter.getSecondToken(event.address),
        ]);

        const [
            firstTokenAmount,
            secondTokenAmount,
            firstTokenReserve,
            secondTokenReserve,
        ] =
            event.getTokenIn().tokenID === firstToken.identifier
                ? [
                      event.getTokenIn().amount.toFixed(),
                      event.getTokenOut().amount.toFixed(),
                      event.getTokenInReserves().toFixed(),
                      event.getTokenOutReserves().toFixed(),
                  ]
                : [
                      event.getTokenOut().amount.toFixed(),
                      event.getTokenIn().amount.toFixed(),
                      event.getTokenOutReserves().toFixed(),
                      event.getTokenInReserves().toFixed(),
                  ];

        await this.pairHandler.updatePairReserves(
            event.getAddress(),
            firstTokenReserve,
            secondTokenReserve,
        );

        const [
            firstTokenPrice,
            secondTokenPrice,
            firstTokenPriceUSD,
            secondTokenPriceUSD,
            liquidity,
            totalFeePercent,
            newTotalLockedValueUSD,
        ] = await Promise.all([
            this.pairCompute.computeFirstTokenPrice(event.address),
            this.pairCompute.computeSecondTokenPrice(event.address),
            this.pairCompute.computeFirstTokenPriceUSD(event.address),
            this.pairCompute.computeSecondTokenPriceUSD(event.address),
            this.pairGetter.getTotalSupply(event.address),
            this.pairGetter.getTotalFeePercent(event.address),
            this.routerCompute.computeTotalLockedValueUSD(),
        ]);

        const firstTokenValues = {
            firstTokenPrice,
            firstTokenLocked: firstTokenReserve,
            firstTokenLockedValueUSD: computeValueUSD(
                firstTokenReserve,
                firstToken.decimals,
                firstTokenPriceUSD,
            ).toFixed(),
            firstTokenVolume: firstTokenAmount,
        };
        const secondTokenValues = {
            secondTokenPrice,
            secondTokenLocked: secondTokenReserve,
            secondTokenLockedValueUSD: computeValueUSD(
                secondTokenReserve,
                secondToken.decimals,
                secondTokenPriceUSD,
            ).toFixed(),
            secondTokenVolume: secondTokenAmount,
        };

        const lockedValueUSD = new BigNumber(
            firstTokenValues.firstTokenLockedValueUSD,
        )
            .plus(secondTokenValues.secondTokenLockedValueUSD)
            .toFixed();

        const firstTokenVolumeUSD = computeValueUSD(
            firstTokenValues.firstTokenVolume,
            firstToken.decimals,
            firstTokenPriceUSD,
        );
        const secondTokenVolumeUSD = computeValueUSD(
            secondTokenValues.secondTokenVolume,
            secondToken.decimals,
            secondTokenPriceUSD,
        );
        const volumeUSD = firstTokenVolumeUSD
            .plus(secondTokenVolumeUSD)
            .dividedBy(2);

        const feesUSD =
            event.getTokenIn().tokenID === firstToken.identifier
                ? computeValueUSD(
                      firstTokenAmount,
                      firstToken.decimals,
                      firstTokenPriceUSD,
                  ).times(totalFeePercent)
                : computeValueUSD(
                      secondTokenAmount,
                      secondToken.decimals,
                      secondTokenPriceUSD,
                  ).times(totalFeePercent);

        const data = [];
        data[event.address] = {
            ...firstTokenValues,
            ...secondTokenValues,
            lockedValueUSD,
            liquidity,
            volumeUSD: volumeUSD.toFixed(),
            feesUSD: feesUSD.toFixed(),
        };

        const [firstTokenTotalLockedValue, secondTokenTotalLockedValue] =
            await Promise.all([
                this.pairHandler.getTokenTotalLockedValue(
                    firstToken.identifier,
                ),
                this.pairHandler.getTokenTotalLockedValue(
                    secondToken.identifier,
                ),
            ]);
        data[firstToken.identifier] = {
            lockedValue: firstTokenTotalLockedValue,
            lockedValueUSD: computeValueUSD(
                firstTokenTotalLockedValue,
                firstToken.decimals,
                firstTokenPriceUSD,
            ),
            priceUSD: firstTokenPriceUSD,
            volume: firstTokenAmount,
            volumeUSD: firstTokenVolumeUSD.toFixed(),
        };
        data[secondToken.identifier] = {
            lockedValue: secondTokenTotalLockedValue,
            lockedValueUSD: computeValueUSD(
                secondTokenTotalLockedValue,
                secondToken.decimals,
                secondTokenPriceUSD,
            ),
            priceUSD: secondTokenPriceUSD,
            volume: secondTokenAmount,
            volumeUSD: secondTokenVolumeUSD.toFixed(),
        };

        data['factory'] = {
            totalLockedValueUSD: newTotalLockedValueUSD.toFixed(),
        };

        await this.updatePairPrices(
            event.address,
            firstTokenPrice,
            secondTokenPrice,
            firstTokenPriceUSD,
            secondTokenPriceUSD,
        );

        event.getIdentifier() === PAIR_EVENTS.SWAP_FIXED_INPUT
            ? await this.pubSub.publish(PAIR_EVENTS.SWAP_FIXED_INPUT, {
                  swapFixedInputEvent: event,
              })
            : await this.pubSub.publish(PAIR_EVENTS.SWAP_FIXED_OUTPUT, {
                  swapFixedOutputEvent: event,
              });

        return [data, event.getTimestamp().toNumber()];
    }

    async handleSwapNoFeeEvent(event: SwapNoFeeEvent): Promise<void> {
        await this.pubSub.publish(PAIR_EVENTS.SWAP_NO_FEE, {
            swapNoFeeEvent: event,
        });
    }

    private async updatePairPrices(
        pairAddress: string,
        firstTokenPrice: string,
        secondTokenPrice: string,
        firstTokenPriceUSD: string,
        secondTokenPriceUSD: string,
    ): Promise<void> {
        const cacheKeys = await Promise.all([
            this.pairSetter.setFirstTokenPrice(pairAddress, firstTokenPrice),
            this.pairSetter.setSecondTokenPrice(pairAddress, secondTokenPrice),
            this.pairSetter.setFirstTokenPriceUSD(
                pairAddress,
                firstTokenPriceUSD,
            ),
            this.pairSetter.setSecondTokenPriceUSD(
                pairAddress,
                secondTokenPriceUSD,
            ),
        ]);
        await this.deleteCacheKeys(cacheKeys);
    }

    private async deleteCacheKeys(invalidatedKeys: string[]) {
        await this.pubSub.publish('deleteCacheKeys', invalidatedKeys);
    }
}
