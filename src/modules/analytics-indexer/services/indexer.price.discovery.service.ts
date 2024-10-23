import { Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { DepositEvent, WithdrawEvent } from '@multiversx/sdk-exchange';
import { quote } from 'src/modules/pair/pair.utils';
import { IndexerStateService } from './indexer.state.service';
import { IndexerPairService } from './indexer.pair.service';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';

@Injectable()
export class IndexerPriceDiscoveryService {
    constructor(
        private readonly stateService: IndexerStateService,
        private readonly pairService: IndexerPairService,
    ) {}

    public async computeAcceptedTokenPrice(
        priceDiscoveryAddress: string,
        event: DepositEvent | WithdrawEvent,
    ): Promise<string> {
        const [
            launchedToken,
            acceptedToken,
            launchedTokenAmount,
            acceptedTokenAmount,
        ] = await Promise.all([
            this.getLaunchedToken(priceDiscoveryAddress),
            this.getAcceptedToken(priceDiscoveryAddress),
            event.launchedTokenAmount.toString(),
            event.acceptedTokenAmount.toString(),
        ]);

        const acceptedTokenPrice = quote(
            new BigNumber(`1e${acceptedToken.decimals}`).toFixed(),
            acceptedTokenAmount,
            launchedTokenAmount,
        );

        return new BigNumber(acceptedTokenPrice)
            .multipliedBy(`1e-${launchedToken.decimals}`)
            .toFixed();
    }

    private async computeLaunchedTokenPrice(
        priceDiscoveryAddress: string,
        event: DepositEvent | WithdrawEvent,
    ): Promise<string> {
        const [
            launchedToken,
            acceptedToken,
            launchedTokenAmount,
            acceptedTokenAmount,
        ] = await Promise.all([
            this.getLaunchedToken(priceDiscoveryAddress),
            this.getAcceptedToken(priceDiscoveryAddress),
            event.launchedTokenAmount.toString(),
            event.acceptedTokenAmount.toString(),
        ]);

        const launchedTokenPrice = quote(
            new BigNumber(`1e${launchedToken.decimals}`).toFixed(),
            launchedTokenAmount,
            acceptedTokenAmount,
        );

        return new BigNumber(launchedTokenPrice)
            .multipliedBy(`1e-${acceptedToken.decimals}`)
            .toFixed();
    }

    public async computeLaunchedTokenPriceUSD(
        priceDiscoveryAddress: string,
        event: DepositEvent | WithdrawEvent,
    ): Promise<string> {
        const acceptedToken = await this.getAcceptedToken(
            priceDiscoveryAddress,
        );
        const acceptedTokenPriceUSD = this.pairService.getTokenPriceUSD(
            acceptedToken.identifier,
        );

        const [launchedTokenPrice] = await Promise.all([
            this.computeLaunchedTokenPrice(priceDiscoveryAddress, event),
        ]);

        return new BigNumber(launchedTokenPrice)
            .multipliedBy(acceptedTokenPriceUSD)
            .toFixed();
    }

    public async getLaunchedToken(
        priceDiscoveryAddress: string,
    ): Promise<EsdtToken> {
        const launchedTokenID = this.stateService.getLaunchedTokenID(
            priceDiscoveryAddress,
        );
        return await this.stateService.getTokenMetadata(launchedTokenID);
    }

    private async getAcceptedToken(
        priceDiscoveryAddress: string,
    ): Promise<EsdtToken> {
        const acceptedTokenID = this.stateService.getAcceptedTokenID(
            priceDiscoveryAddress,
        );
        return await this.stateService.getTokenMetadata(acceptedTokenID);
    }
}
