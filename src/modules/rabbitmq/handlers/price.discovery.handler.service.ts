import {
    DepositEvent,
    PRICE_DISCOVERY_EVENTS,
    WithdrawEvent,
} from '@multiversx/sdk-exchange';
import { Inject, Injectable } from '@nestjs/common';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { PUB_SUB } from 'src/services/redis.pubSub.module';
import { PriceDiscoveryComputeService } from '../../price-discovery/services/price.discovery.compute.service';
import { PriceDiscoverySetterService } from '../../price-discovery/services/price.discovery.setter.service';
import { PriceDiscoveryService } from 'src/modules/price-discovery/services/price.discovery.service';

@Injectable()
export class PriceDiscoveryEventHandler {
    constructor(
        private readonly priceDiscoveryService: PriceDiscoveryService,
        private readonly priceDiscoverySetter: PriceDiscoverySetterService,
        private readonly priceDiscoveryCompute: PriceDiscoveryComputeService,
        @Inject(PUB_SUB) private pubSub: RedisPubSub,
    ) {}

    async handleEvent(
        event: DepositEvent | WithdrawEvent,
    ): Promise<[any[], number]> {
        const acceptedToken = await this.priceDiscoveryService.getAcceptedToken(
            event.getAddress(),
        );

        const [
            priceDiscoveryAddress,
            launchedTokenAmount,
            acceptedTokenAmount,
            launchedTokenPrice,
        ] = [
            event.getAddress(),
            event.launchedTokenAmount.toFixed(),
            event.acceptedTokenAmount.toFixed(),
            event.launchedTokenPrice
                .multipliedBy(`1e-${acceptedToken.decimals}`)
                .toFixed(),
        ];

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
                launchedTokenPrice,
            ),
            this.priceDiscoverySetter.setCurrentPhase(
                priceDiscoveryAddress,
                event.currentPhase,
            ),
        ]);

        await this.deleteCacheKeys(cacheKeys);

        const [
            acceptedTokenPrice,
            launchedTokenPriceUSD,
            acceptedTokenPriceUSD,
        ] = await Promise.all([
            this.priceDiscoveryCompute.computeAcceptedTokenPrice(
                priceDiscoveryAddress,
            ),
            this.priceDiscoveryCompute.computeLaunchedTokenPriceUSD(
                priceDiscoveryAddress,
            ),
            this.priceDiscoveryCompute.computeAcceptedTokenPriceUSD(
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

        const data = [];
        const timestamp = event.getTopics().toJSON().timestamp;
        data[priceDiscoveryAddress] = {
            launchedTokenAmount,
            acceptedTokenAmount,
            launchedTokenPrice,
            acceptedTokenPrice,
            launchedTokenPriceUSD,
            acceptedTokenPriceUSD,
        };

        return [data, timestamp];
    }

    private async deleteCacheKeys(invalidatedKeys: string[]) {
        await this.pubSub.publish('deleteCacheKeys', invalidatedKeys);
    }
}
