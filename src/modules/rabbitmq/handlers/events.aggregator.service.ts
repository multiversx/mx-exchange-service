import { Inject, Injectable } from '@nestjs/common';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { RouterComputeService } from 'src/modules/router/services/router.compute.service';
import { RouterSetterService } from 'src/modules/router/services/router.setter.service';
import { MXDataApiService } from 'src/services/multiversx-communication/mx.data.api.service';
import { PUB_SUB } from 'src/services/redis.pubSub.module';
import { computeValueUSD } from 'src/utils/token.converters';
import { EventsBatchContext } from './events.batch.context';
import { PairHandler } from './pair.handler.service';

@Injectable()
export class EventsAggregatorService {
    constructor(
        private readonly routerCompute: RouterComputeService,
        private readonly routerSetter: RouterSetterService,
        private readonly pairHandler: PairHandler,
        private readonly dataApi: MXDataApiService,
        @Inject(PUB_SUB) private readonly pubSub: RedisPubSub,
    ) {}

    async computeBatchAggregates(
        context: EventsBatchContext,
    ): Promise<Record<string, any>> {
        if (!context.hasTrackedTokens()) {
            return {};
        }

        const trackedTokens = context.trackedTokens();

        const [usdcPrice, totalLockedValueUSD, tokensLockedValue] =
            await Promise.all([
                this.dataApi.getTokenPrice('USDC'),
                this.routerCompute.computeTotalLockedValueUSD(),
                Promise.all(
                    trackedTokens.map(([tokenID]) =>
                        this.pairHandler.getTokenTotalLockedValue(tokenID),
                    ),
                ),
            ]);

        const data: Record<string, any> = {
            factory: {
                totalLockedValueUSD: totalLockedValueUSD
                    .dividedBy(usdcPrice)
                    .toFixed(),
            },
        };

        trackedTokens.forEach(([tokenID, { decimals, priceUSD }], index) => {
            const lockedValue = tokensLockedValue[index];

            data[tokenID] = {
                lockedValue,
                lockedValueUSD: computeValueUSD(lockedValue, decimals, priceUSD)
                    .dividedBy(usdcPrice)
                    .toFixed(),
            };
        });

        const cacheKey = await this.routerSetter.setTotalLockedValueUSD(
            totalLockedValueUSD.toFixed(),
        );
        await this.pubSub.publish('deleteCacheKeys', [cacheKey]);

        return data;
    }
}
