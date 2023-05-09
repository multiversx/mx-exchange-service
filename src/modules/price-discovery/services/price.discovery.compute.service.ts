import { Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { quote } from 'src/modules/pair/pair.utils';
import { PairComputeService } from 'src/modules/pair/services/pair.compute.service';
import { PriceDiscoveryAbiService } from './price.discovery.abi.service';
import { PriceDiscoveryService } from './price.discovery.service';
import { ErrorLoggerAsync } from 'src/helpers/decorators/error.logger';
import { GetOrSetCache } from 'src/helpers/decorators/caching.decorator';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';
import { IPriceDiscoveryComputeService } from './interfaces';

@Injectable()
export class PriceDiscoveryComputeService
    implements IPriceDiscoveryComputeService
{
    constructor(
        private readonly pairCompute: PairComputeService,
        private readonly priceDiscoveryAbi: PriceDiscoveryAbiService,
        private readonly priceDiscoveryService: PriceDiscoveryService,
    ) {}

    @ErrorLoggerAsync({
        className: PriceDiscoveryComputeService.name,
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'priceDiscovery',
        remoteTtl: CacheTtlInfo.Price.remoteTtl,
        localTtl: CacheTtlInfo.Price.localTtl,
    })
    async launchedTokenPrice(priceDiscoveryAddress: string): Promise<string> {
        return await this.computeLaunchedTokenPrice(priceDiscoveryAddress);
    }

    async computeLaunchedTokenPrice(
        priceDiscoveryAddress: string,
    ): Promise<string> {
        const [
            launchedToken,
            acceptedToken,
            launchedTokenAmount,
            acceptedTokenAmount,
        ] = await Promise.all([
            this.priceDiscoveryService.getLaunchedToken(priceDiscoveryAddress),
            this.priceDiscoveryService.getAcceptedToken(priceDiscoveryAddress),
            this.priceDiscoveryAbi.launchedTokenAmount(priceDiscoveryAddress),
            this.priceDiscoveryAbi.acceptedTokenAmount(priceDiscoveryAddress),
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

    @ErrorLoggerAsync({
        className: PriceDiscoveryComputeService.name,
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'priceDiscovery',
        remoteTtl: CacheTtlInfo.Price.remoteTtl,
        localTtl: CacheTtlInfo.Price.localTtl,
    })
    async acceptedTokenPrice(priceDiscoveryAddress: string): Promise<string> {
        return await this.computeAcceptedTokenPrice(priceDiscoveryAddress);
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
            this.priceDiscoveryService.getLaunchedToken(priceDiscoveryAddress),
            this.priceDiscoveryService.getAcceptedToken(priceDiscoveryAddress),
            this.priceDiscoveryAbi.launchedTokenAmount(priceDiscoveryAddress),
            this.priceDiscoveryAbi.acceptedTokenAmount(priceDiscoveryAddress),
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

    @ErrorLoggerAsync({
        className: PriceDiscoveryComputeService.name,
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'priceDiscovery',
        remoteTtl: CacheTtlInfo.Price.remoteTtl,
        localTtl: CacheTtlInfo.Price.localTtl,
    })
    async launchedTokenPriceUSD(
        priceDiscoveryAddress: string,
    ): Promise<string> {
        return await this.computeLaunchedTokenPriceUSD(priceDiscoveryAddress);
    }

    async computeLaunchedTokenPriceUSD(
        priceDiscoveryAddress: string,
    ): Promise<string> {
        const acceptedToken = await this.priceDiscoveryService.getAcceptedToken(
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

    @ErrorLoggerAsync({
        className: PriceDiscoveryComputeService.name,
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'priceDiscovery',
        remoteTtl: CacheTtlInfo.Price.remoteTtl,
        localTtl: CacheTtlInfo.Price.localTtl,
    })
    async acceptedTokenPriceUSD(
        priceDiscoveryAddress: string,
    ): Promise<string> {
        return await this.computeAcceptedTokenPriceUSD(priceDiscoveryAddress);
    }

    async computeAcceptedTokenPriceUSD(
        priceDiscoveryAddress: string,
    ): Promise<string> {
        const acceptedTokenID = await this.priceDiscoveryAbi.acceptedTokenID(
            priceDiscoveryAddress,
        );
        return await this.pairCompute.tokenPriceUSD(acceptedTokenID);
    }
}
