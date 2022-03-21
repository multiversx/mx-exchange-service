import { forwardRef, Inject, Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { quote } from 'src/modules/pair/pair.utils';
import { PairGetterService } from 'src/modules/pair/services/pair.getter.service';
import { computeValueUSD } from 'src/utils/token.converters';
import { PriceDiscoveryGetterService } from './price.discovery.getter.service';

@Injectable()
export class PriceDiscoveryComputeService {
    constructor(
        @Inject(forwardRef(() => PriceDiscoveryGetterService))
        private readonly priceDiscoveryGetter: PriceDiscoveryGetterService,
        private readonly pairGetter: PairGetterService,
    ) {}

    async computeLaunchedTokenPrice(
        priceDiscoveryAddress: string,
    ): Promise<string> {
        const [
            launchedToken,
            acceptedToken,
            launchedTokenAmount,
            acceptedTokenAmount,
        ] = await Promise.all([
            this.priceDiscoveryGetter.getLaunchedToken(priceDiscoveryAddress),
            this.priceDiscoveryGetter.getAcceptedToken(priceDiscoveryAddress),
            this.priceDiscoveryGetter.getLaunchedTokenAmount(
                priceDiscoveryAddress,
            ),
            this.priceDiscoveryGetter.getAcceptedTokenAmount(
                priceDiscoveryAddress,
            ),
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

    async computeAcceptedTokenPrice(
        priceDiscoveryAddress: string,
    ): Promise<string> {
        const [
            launchedToken,
            acceptedToken,
            launchedTokenAmount,
            acceptedTokenAmount,
        ] = await Promise.all([
            this.priceDiscoveryGetter.getLaunchedToken(priceDiscoveryAddress),
            this.priceDiscoveryGetter.getAcceptedToken(priceDiscoveryAddress),
            this.priceDiscoveryGetter.getLaunchedTokenAmount(
                priceDiscoveryAddress,
            ),
            this.priceDiscoveryGetter.getAcceptedTokenAmount(
                priceDiscoveryAddress,
            ),
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

    async computeLaunchedTokenPriceUSD(
        priceDiscoveryAddress: string,
    ): Promise<string> {
        const acceptedToken = await this.priceDiscoveryGetter.getAcceptedToken(
            priceDiscoveryAddress,
        );
        const [launchedTokenPrice, acceptedTokenPriceUSD] = await Promise.all([
            this.computeLaunchedTokenPrice(priceDiscoveryAddress),
            this.pairGetter.getTokenPriceUSD(acceptedToken.identifier),
        ]);

        return new BigNumber(launchedTokenPrice)
            .multipliedBy(acceptedTokenPriceUSD)
            .toFixed();
    }
}
