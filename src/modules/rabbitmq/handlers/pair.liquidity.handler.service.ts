import { AddLiquidityEvent, PAIR_EVENTS } from '@elrondnetwork/erdjs-dex';
import { Inject, Injectable } from '@nestjs/common';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { PairSetterService } from 'src/modules/pair/services/pair.setter.service';
import { RouterComputeService } from 'src/modules/router/services/router.compute.service';
import { RouterSetterService } from 'src/modules/router/services/router.setter.service';
import { TokenGetterService } from 'src/modules/tokens/services/token.getter.service';
import { PUB_SUB } from 'src/services/redis.pubSub.module';
import { computeValueUSD } from 'src/utils/token.converters';
import { PairHandler } from './pair.handler.service';

@Injectable()
export class LiquidityHandler {
    constructor(
        private readonly pairSetter: PairSetterService,
        private readonly routerCompute: RouterComputeService,
        private readonly routerSetter: RouterSetterService,
        private readonly tokenGetter: TokenGetterService,
        private readonly pairHandler: PairHandler,
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
        const [
            firstToken,
            secondToken,
            firstTokenPriceUSD,
            secondTokenPriceUSD,
            newTotalLockedValueUSD,
        ] = await Promise.all([
            this.tokenGetter.getTokenMetadata(event.getFirstToken().tokenID),
            this.tokenGetter.getTokenMetadata(event.getSecondToken().tokenID),
            this.tokenGetter.getDerivedUSD(event.getFirstToken().tokenID),
            this.tokenGetter.getDerivedUSD(event.getSecondToken().tokenID),
            this.routerCompute.computeTotalLockedValueUSD(),
        ]);

        const data = [];
        data['factory'] = {
            totalLockedValueUSD: newTotalLockedValueUSD.toFixed(),
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
            firstTokenLockedValueUSD: firstTokenLockedValueUSD.toFixed(),
            secondTokenLocked: event.getSecondTokenReserves().toFixed(),
            secondTokenLockedValueUSD: secondTokenLockedValueUSD.toFixed(),
            lockedValueUSD: lockedValueUSD.toFixed(),
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
            ),
        };
        data[secondToken.identifier] = {
            lockedValue: secondTokenTotalLockedValue,
            lockedValueUSD: computeValueUSD(
                secondTokenTotalLockedValue,
                secondToken.decimals,
                secondTokenPriceUSD,
            ),
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
