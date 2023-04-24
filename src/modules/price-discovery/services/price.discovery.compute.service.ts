import { forwardRef, Inject, Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { quote } from 'src/modules/pair/pair.utils';
import { PriceDiscoveryGetterService } from './price.discovery.getter.service';
import { PairComputeService } from 'src/modules/pair/services/pair.compute.service';

@Injectable()
export class PriceDiscoveryComputeService {
    constructor(
        @Inject(forwardRef(() => PriceDiscoveryGetterService))
        private readonly priceDiscoveryGetter: PriceDiscoveryGetterService,
        private readonly pairCompute: PairComputeService,
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
            this.pairCompute.tokenPriceUSD(acceptedToken.identifier),
        ]);

        return new BigNumber(launchedTokenPrice)
            .multipliedBy(acceptedTokenPriceUSD)
            .toFixed();
    }
}
