import { Injectable } from '@nestjs/common';
import { DepositEvent, WithdrawEvent } from '@multiversx/sdk-exchange';
import { quote } from 'src/modules/pair/pair.utils';
import { IndexerStateService } from './indexer.state.service';
import { IndexerPairService } from './indexer.pair.service';
import BigNumber from 'bignumber.js';

@Injectable()
export class IndexerPriceDiscoveryService {
    constructor(
        private readonly stateService: IndexerStateService,
        private readonly pairService: IndexerPairService,
    ) {}

    public computeAcceptedTokenPrice(
        priceDiscoveryAddress: string,
        event: DepositEvent | WithdrawEvent,
    ): string {
        const { launchedToken, acceptedToken } =
            this.stateService.getPriceDiscoveryMetadata(priceDiscoveryAddress);

        const launchedTokenAmount = event.launchedTokenAmount.toString();
        const acceptedTokenAmount = event.acceptedTokenAmount.toString();

        const acceptedTokenPrice = quote(
            new BigNumber(`1e${acceptedToken.decimals}`).toFixed(),
            acceptedTokenAmount,
            launchedTokenAmount,
        );

        return new BigNumber(acceptedTokenPrice)
            .multipliedBy(`1e-${launchedToken.decimals}`)
            .toFixed();
    }

    private computeLaunchedTokenPrice(
        priceDiscoveryAddress: string,
        event: DepositEvent | WithdrawEvent,
    ): string {
        const { launchedToken, acceptedToken } =
            this.stateService.getPriceDiscoveryMetadata(priceDiscoveryAddress);

        const launchedTokenAmount = event.launchedTokenAmount.toString();
        const acceptedTokenAmount = event.acceptedTokenAmount.toString();

        const launchedTokenPrice = quote(
            new BigNumber(`1e${launchedToken.decimals}`).toFixed(),
            launchedTokenAmount,
            acceptedTokenAmount,
        );

        return new BigNumber(launchedTokenPrice)
            .multipliedBy(`1e-${acceptedToken.decimals}`)
            .toFixed();
    }

    public computeLaunchedTokenPriceUSD(
        priceDiscoveryAddress: string,
        event: DepositEvent | WithdrawEvent,
    ): string {
        const { acceptedToken } = this.stateService.getPriceDiscoveryMetadata(
            priceDiscoveryAddress,
        );

        const acceptedTokenPriceUSD = this.pairService.getTokenPriceUSD(
            acceptedToken.identifier,
        );

        const launchedTokenPrice = this.computeLaunchedTokenPrice(
            priceDiscoveryAddress,
            event,
        );

        return new BigNumber(launchedTokenPrice)
            .multipliedBy(acceptedTokenPriceUSD)
            .toFixed();
    }
}
