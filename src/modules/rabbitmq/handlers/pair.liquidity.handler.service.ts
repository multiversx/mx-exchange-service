import { AddLiquidityEvent, PAIR_EVENTS } from '@multiversx/sdk-exchange';
import { Inject, Injectable } from '@nestjs/common';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { PairSetterService } from 'src/modules/pair/services/pair.setter.service';
import { RouterComputeService } from 'src/modules/router/services/router.compute.service';
import { RouterSetterService } from 'src/modules/router/services/router.setter.service';
import { MXDataApiService } from 'src/services/multiversx-communication/mx.data.api.service';
import { PUB_SUB } from 'src/services/redis.pubSub.module';
import { computeValueUSD } from 'src/utils/token.converters';
import { PairHandler } from './pair.handler.service';
import { TokenService } from 'src/modules/tokens/services/token.service';
import { TokenComputeService } from 'src/modules/tokens/services/token.compute.service';

@Injectable()
export class LiquidityHandler {
    constructor(
        private readonly pairSetter: PairSetterService,
        private readonly routerCompute: RouterComputeService,
        private readonly routerSetter: RouterSetterService,
        private readonly tokenService: TokenService,
        private readonly tokenCompute: TokenComputeService,
        private readonly pairHandler: PairHandler,
        private readonly dataApi: MXDataApiService,
        @Inject(PUB_SUB) private pubSub: RedisPubSub,
    ) {}

    async handleLiquidityEvent(
        event: AddLiquidityEvent,
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
            newTotalLockedValueUSD,
        ] = await Promise.all([
            this.tokenService.tokenMetadata(event.getFirstToken().tokenID),
            this.tokenService.tokenMetadata(event.getSecondToken().tokenID),
            this.tokenCompute.tokenPriceDerivedUSD(
                event.getFirstToken().tokenID,
            ),
            this.tokenCompute.tokenPriceDerivedUSD(
                event.getSecondToken().tokenID,
            ),
            this.routerCompute.computeTotalLockedValueUSD(),
        ]);

        const data = [];
        data['factory'] = {
            totalLockedValueUSD: newTotalLockedValueUSD
                .dividedBy(usdcPrice)
                .toFixed(),
        };
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
            )
                .dividedBy(usdcPrice)
                .toFixed(),
        };
        data[secondToken.identifier] = {
            lockedValue: secondTokenTotalLockedValue,
            lockedValueUSD: computeValueUSD(
                secondTokenTotalLockedValue,
                secondToken.decimals,
                secondTokenPriceUSD,
            )
                .dividedBy(usdcPrice)
                .toFixed(),
        };

        const cacheKeys = await Promise.all([
            this.pairSetter.setFirstTokenLockedValueUSD(
                event.address,
                firstTokenLockedValueUSD.toFixed(),
            ),
            this.pairSetter.setSecondTokenLockedValueUSD(
                event.address,
                secondTokenLockedValueUSD.toFixed(),
            ),
            this.routerSetter.setTotalLockedValueUSD(
                newTotalLockedValueUSD.toFixed(),
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
