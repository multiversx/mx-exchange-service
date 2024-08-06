import { Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { quote } from 'src/modules/pair/pair.utils';
import { PairComputeService } from 'src/modules/pair/services/pair.compute.service';
import { PriceDiscoveryAbiService } from './price.discovery.abi.service';
import { PriceDiscoveryService } from './price.discovery.service';
import { ErrorLoggerAsync } from '@multiversx/sdk-nestjs-common';
import { GetOrSetCache } from 'src/helpers/decorators/caching.decorator';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';
import { IPriceDiscoveryComputeService } from './interfaces';
import { AnalyticsQueryService } from 'src/services/analytics/services/analytics.query.service';
import { HistoricDataModel } from 'src/modules/analytics/models/analytics.model';
import { MXApiService } from 'src/services/multiversx-communication/mx.api.service';
import moment from 'moment';

@Injectable()
export class PriceDiscoveryComputeService
    implements IPriceDiscoveryComputeService
{
    constructor(
        private readonly pairCompute: PairComputeService,
        private readonly priceDiscoveryAbi: PriceDiscoveryAbiService,
        private readonly priceDiscoveryService: PriceDiscoveryService,
        private readonly analyticsQuery: AnalyticsQueryService,
        private readonly apiService: MXApiService,
    ) {}

    @ErrorLoggerAsync({
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
        const phase = await this.priceDiscoveryAbi.currentPhase(
            priceDiscoveryAddress,
        );

        if (phase.name === 'Redeem') {
            const latestPrice = await this.closingValues(
                priceDiscoveryAddress,
                'launchedTokenPrice',
                '1 hour',
            );
            return latestPrice.length > 0 ? latestPrice.last().value : '0';
        }

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
        const phase = await this.priceDiscoveryAbi.currentPhase(
            priceDiscoveryAddress,
        );

        if (phase.name === 'Redeem') {
            const latestPrice = await this.closingValues(
                priceDiscoveryAddress,
                'acceptedTokenPrice',
                '1 hour',
            );
            return latestPrice.length > 0 ? latestPrice.last().value : '0';
        }

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
        const phase = await this.priceDiscoveryAbi.currentPhase(
            priceDiscoveryAddress,
        );

        if (phase.name === 'Redeem') {
            const latestPrice = await this.closingValues(
                priceDiscoveryAddress,
                'launchedTokenPriceUSD',
                '1 hour',
            );
            return latestPrice.length > 0 ? latestPrice.last().value : '0';
        }

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
        const phase = await this.priceDiscoveryAbi.currentPhase(
            priceDiscoveryAddress,
        );

        if (phase.name === 'Redeem') {
            const latestPrice = await this.closingValues(
                priceDiscoveryAddress,
                'acceptedTokenPriceUSD',
                '1 hour',
            );
            return latestPrice.length > 0 ? latestPrice.last().value : '0';
        }

        const acceptedTokenID = await this.priceDiscoveryAbi.acceptedTokenID(
            priceDiscoveryAddress,
        );
        return await this.pairCompute.tokenPriceUSD(acceptedTokenID);
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'priceDiscovery',
        remoteTtl: CacheTtlInfo.Analytics.remoteTtl,
        localTtl: CacheTtlInfo.Analytics.localTtl,
    })
    async closingValues(
        priceDiscoveryAddress: string,
        metric: string,
        interval: string,
    ): Promise<HistoricDataModel[]> {
        return await this.computeClosingValues(
            priceDiscoveryAddress,
            metric,
            interval,
        );
    }

    async computeClosingValues(
        priceDiscoveryAddress: string,
        metric: string,
        interval: string,
    ): Promise<HistoricDataModel[]> {
        const [startBlockNonce, endBlockNonce] = await Promise.all([
            this.priceDiscoveryAbi.startBlock(priceDiscoveryAddress),
            this.priceDiscoveryAbi.endBlock(priceDiscoveryAddress),
        ]);

        const [startBlock, endBlock] = await Promise.all([
            this.apiService.getBlockByNonce(1, startBlockNonce),
            this.apiService.getBlockByNonce(1, endBlockNonce),
        ]);

        if (startBlock === undefined) {
            return [];
        }

        const [startDate, endDate] = [
            startBlock.timestamp,
            endBlock ? endBlock.timestamp : moment().unix(),
        ];

        return await this.analyticsQuery.getPDCloseValues({
            series: priceDiscoveryAddress,
            metric,
            timeBucket: interval,
            startDate: moment.unix(startDate).toDate(),
            endDate: moment.unix(endDate).toDate(),
        });
    }
}
