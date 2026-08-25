import { AddLiquidityEvent, PAIR_EVENTS } from '@multiversx/sdk-exchange';
import { Inject, Injectable } from '@nestjs/common';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { PairSetterService } from 'src/modules/pair/services/pair.setter.service';
import { MXDataApiService } from 'src/services/multiversx-communication/mx.data.api.service';
import { PUB_SUB } from 'src/services/redis.pubSub.module';
import { computeValueUSD } from 'src/utils/token.converters';
import { PairHandler } from './pair.handler.service';
import { TokenService } from 'src/modules/tokens/services/token.service';
import { TokenComputeService } from 'src/modules/tokens/services/token.compute.service';
import { EventsBatchContext } from './events.batch.context';

@Injectable()
export class LiquidityHandler {
    constructor(
        private readonly pairSetter: PairSetterService,
        private readonly tokenService: TokenService,
        private readonly tokenCompute: TokenComputeService,
        private readonly pairHandler: PairHandler,
        private readonly dataApi: MXDataApiService,
        @Inject(PUB_SUB) private pubSub: RedisPubSub,
    ) {}

    async handleLiquidityEvent(
        event: AddLiquidityEvent,
        context: EventsBatchContext,
    ): Promise<[any[], number]> {
        await this.pairHandler.updatePairReserves(
            event.getAddress(),
            event.getFirstTokenReserves().toFixed(),
            event.getSecondTokenReserves().toFixed(),
            event.getLiquidityPoolSupply().toFixed(),
        );
        const usdcPrice = await this.dataApi.getTokenPrice('USDC');
        const [
            firstToken,
            secondToken,
            firstTokenPriceUSD,
            secondTokenPriceUSD,
        ] = await Promise.all([
            this.tokenService.tokenMetadata(event.getFirstToken().tokenID),
            this.tokenService.tokenMetadata(event.getSecondToken().tokenID),
            this.tokenCompute.tokenPriceDerivedUSD(
                event.getFirstToken().tokenID,
            ),
            this.tokenCompute.tokenPriceDerivedUSD(
                event.getSecondToken().tokenID,
            ),
        ]);

        const data = [];
        const firstTokenLockedValueUSD = computeValueUSD(
            event.getFirstTokenReserves().toFixed(),
            firstToken.decimals,
            firstTokenPriceUSD,
        );
        const secondTokenLockedValueUSD = computeValueUSD(
            event.getSecondTokenReserves().toFixed(),
            secondToken.decimals,
            secondTokenPriceUSD,
        );
        const lockedValueUSD = firstTokenLockedValueUSD.plus(
            secondTokenLockedValueUSD,
        );

        data[event.address] = {
            firstTokenLocked: event.getFirstTokenReserves().toFixed(),
            firstTokenLockedValueUSD: firstTokenLockedValueUSD
                .dividedBy(usdcPrice)
                .toFixed(),
            secondTokenLocked: event.getSecondTokenReserves().toFixed(),
            secondTokenLockedValueUSD: secondTokenLockedValueUSD
                .dividedBy(usdcPrice)
                .toFixed(),
            lockedValueUSD: lockedValueUSD.dividedBy(usdcPrice).toFixed(),
            liquidity: event.getLiquidityPoolSupply().toFixed(),
        };

        context.trackTokenLockedValue(
            firstToken.identifier,
            firstToken.decimals,
            firstTokenPriceUSD,
        );
        context.trackTokenLockedValue(
            secondToken.identifier,
            secondToken.decimals,
            secondTokenPriceUSD,
        );

        const cacheKeys = await Promise.all([
            this.pairSetter.setFirstTokenLockedValueUSD(
                event.address,
                firstTokenLockedValueUSD.toFixed(),
            ),
            this.pairSetter.setSecondTokenLockedValueUSD(
                event.address,
                secondTokenLockedValueUSD.toFixed(),
            ),
        ]);

        await this.deleteCacheKeys(cacheKeys);

        event.getIdentifier() === PAIR_EVENTS.ADD_LIQUIDITY
            ? await this.pubSub.publish(PAIR_EVENTS.ADD_LIQUIDITY, {
                  addLiquidityEvent: event,
              })
            : await this.pubSub.publish(PAIR_EVENTS.REMOVE_LIQUIDITY, {
                  removeLiquidityEvent: event,
              });

        return [data, event.getTimestamp().toNumber()];
    }

    private async deleteCacheKeys(invalidatedKeys: string[]) {
        await this.pubSub.publish('deleteCacheKeys', invalidatedKeys);
    }
}
