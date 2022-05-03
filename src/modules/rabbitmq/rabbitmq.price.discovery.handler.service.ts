import {
    DepositEvent,
    PRICE_DISCOVERY_EVENTS,
    WithdrawEvent,
} from '@elrondnetwork/elrond-sdk-erdjs-dex';
import { Inject, Injectable } from '@nestjs/common';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { PUB_SUB } from 'src/services/redis.pubSub.module';
import { Logger } from 'winston';
import { PriceDiscoveryComputeService } from '../price-discovery/services/price.discovery.compute.service';
import { PriceDiscoveryGetterService } from '../price-discovery/services/price.discovery.getter.service';
import { PriceDiscoverySetterService } from '../price-discovery/services/price.discovery.setter.service';

@Injectable()
export class RabbitMqPriceDiscoveryHandlerService {
    constructor(
        private readonly priceDiscoveryGetter: PriceDiscoveryGetterService,
        private readonly priceDiscoverySetter: PriceDiscoverySetterService,
        private readonly priceDiscoveryCompute: PriceDiscoveryComputeService,
        @Inject(PUB_SUB) private pubSub: RedisPubSub,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async handleEvent(event: DepositEvent | WithdrawEvent): Promise<void> {
        const [
            priceDiscoveryAddress,
            launchedTokenAmount,
            acceptedTokenAmount,
            launchedTokenPrice,
        ] = [
            event.getAddress(),
            event.launchedTokenAmount.toFixed(),
            event.acceptedTokenAmount.toFixed(),
            event.launchedTokenPrice,
        ];

        const launchedToken = await this.priceDiscoveryGetter.getLaunchedToken(
            priceDiscoveryAddress,
        );

        let cacheKeys: string[] = await Promise.all([
            this.priceDiscoverySetter.setLaunchedTokenAmount(
                priceDiscoveryAddress,
                launchedTokenAmount,
            ),
            this.priceDiscoverySetter.setAcceptedTokenAmount(
                priceDiscoveryAddress,
                acceptedTokenAmount,
            ),
            this.priceDiscoverySetter.setLaunchedTokenPrice(
                priceDiscoveryAddress,
                launchedTokenPrice
                    .multipliedBy(`1e-${launchedToken.decimals}`)
                    .toFixed(),
            ),
            this.priceDiscoverySetter.setCurrentPhase(
                priceDiscoveryAddress,
                event.currentPhase,
            ),
        ]);

        await this.deleteCacheKeys(cacheKeys);

        const [acceptedTokenPrice, launchedTokenPriceUSD] = await Promise.all([
            this.priceDiscoveryCompute.computeAcceptedTokenPrice(
                priceDiscoveryAddress,
            ),
            this.priceDiscoveryCompute.computeLaunchedTokenPriceUSD(
                priceDiscoveryAddress,
            ),
        ]);

        cacheKeys = await Promise.all([
            this.priceDiscoverySetter.setAcceptedTokenPrice(
                priceDiscoveryAddress,
                acceptedTokenPrice,
            ),
            this.priceDiscoverySetter.setLaunchedTokenPriceUSD(
                priceDiscoveryAddress,
                launchedTokenPriceUSD,
            ),
        ]);

        await this.deleteCacheKeys(cacheKeys);

        event.getIdentifier() === PRICE_DISCOVERY_EVENTS.DEPOSIT
            ? await this.pubSub.publish(PRICE_DISCOVERY_EVENTS.DEPOSIT, {
                  depositEvent: event,
              })
            : await this.pubSub.publish(PRICE_DISCOVERY_EVENTS.WITHDARW, {
                  withdrawEvent: event,
              });
    }

    private async deleteCacheKeys(invalidatedKeys: string[]) {
        await this.pubSub.publish('deleteCacheKeys', invalidatedKeys);
    }
}
