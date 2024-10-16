import { DepositEvent, WithdrawEvent } from '@multiversx/sdk-exchange';
import { Injectable } from '@nestjs/common';
import { IndexerPriceDiscoveryService } from '../price.discovery.service';

@Injectable()
export class IndexerPriceDiscoveryHandlerService {
    constructor(
        private readonly priceDiscoveryService: IndexerPriceDiscoveryService,
    ) {}

    async handleOldPriceDiscoveryEvent(
        event: DepositEvent | WithdrawEvent,
    ): Promise<[any[], number]> {
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

        const [acceptedTokenPrice, launchedTokenPriceUSD] = await Promise.all([
            this.priceDiscoveryService.computeAcceptedTokenPrice(
                priceDiscoveryAddress,
                event,
            ),
            this.priceDiscoveryService.computeLaunchedTokenPriceUSD(
                priceDiscoveryAddress,
                event,
            ),
        ]);

        const data = [];
        const timestamp = event.getTopics().toJSON().timestamp;
        data[priceDiscoveryAddress] = {
            launchedTokenAmount,
            acceptedTokenAmount,
            launchedTokenPrice,
            acceptedTokenPrice,
            launchedTokenPriceUSD,
        };

        return [data, timestamp];
    }
}
