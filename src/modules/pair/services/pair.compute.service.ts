import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { BigNumber } from 'bignumber.js';
import { constantsConfig } from 'src/config';
import { TokenComputeService } from 'src/modules/tokens/services/token.compute.service';
import { MXDataApiService } from 'src/services/multiversx-communication/mx.data.api.service';
import { leastType } from 'src/utils/token.type.compare';
import { PairService } from './pair.service';
import { PairAbiService } from './pair.abi.service';
import { ErrorLoggerAsync } from 'src/helpers/decorators/error.logger';
import { GetOrSetCache } from 'src/helpers/decorators/caching.decorator';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';
import { AnalyticsQueryService } from 'src/services/analytics/services/analytics.query.service';
import { ApiConfigService } from 'src/helpers/api.config.service';
import { IPairComputeService } from '../interfaces';
import { TokenService } from 'src/modules/tokens/services/token.service';

@Injectable()
export class PairComputeService implements IPairComputeService {
    constructor(
        private readonly pairAbi: PairAbiService,
        @Inject(forwardRef(() => PairService))
        private readonly pairService: PairService,
        @Inject(forwardRef(() => TokenService))
        private readonly tokenService: TokenService,
        @Inject(forwardRef(() => TokenComputeService))
        private readonly tokenCompute: TokenComputeService,
        private readonly dataApi: MXDataApiService,
        private readonly analyticsQuery: AnalyticsQueryService,
        private readonly apiConfig: ApiConfigService,
    ) {}

    async getTokenPrice(pairAddress: string, tokenID: string): Promise<string> {
        const [firstTokenID, secondTokenID] = await Promise.all([
            this.pairAbi.firstTokenID(pairAddress),
            this.pairAbi.secondTokenID(pairAddress),
        ]);

        switch (tokenID) {
            case firstTokenID:
                return this.firstTokenPrice(pairAddress);
            case secondTokenID:
                return this.secondTokenPrice(pairAddress);
        }
    }

    @ErrorLoggerAsync({
        className: PairComputeService.name,
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'pair',
        remoteTtl: CacheTtlInfo.Price.remoteTtl,
        localTtl: CacheTtlInfo.Price.localTtl,
    })
    async firstTokenPrice(pairAddress: string): Promise<string> {
        return await this.computeFirstTokenPrice(pairAddress);
    }

    async computeFirstTokenPrice(pairAddress: string): Promise<string> {
        const [firstToken, secondToken] = await Promise.all([
            this.pairService.getFirstToken(pairAddress),
            this.pairService.getSecondToken(pairAddress),
        ]);

        const firstTokenPrice =
            await this.pairService.getEquivalentForLiquidity(
                pairAddress,
                firstToken.identifier,
                new BigNumber(`1e${firstToken.decimals}`).toFixed(),
            );
        return firstTokenPrice
            .multipliedBy(`1e-${secondToken.decimals}`)
            .toFixed();
    }

    @ErrorLoggerAsync({
        className: PairComputeService.name,
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'pair',
        remoteTtl: CacheTtlInfo.Price.remoteTtl,
        localTtl: CacheTtlInfo.Price.localTtl,
    })
    async secondTokenPrice(pairAddress: string): Promise<string> {
        return await this.computeSecondTokenPrice(pairAddress);
    }

    async computeSecondTokenPrice(pairAddress: string): Promise<string> {
        const [firstToken, secondToken] = await Promise.all([
            this.pairService.getFirstToken(pairAddress),
            this.pairService.getSecondToken(pairAddress),
        ]);

        const secondTokenPrice =
            await this.pairService.getEquivalentForLiquidity(
                pairAddress,
                secondToken.identifier,
                new BigNumber(`1e${secondToken.decimals}`).toFixed(),
            );
        return secondTokenPrice
            .multipliedBy(`1e-${firstToken.decimals}`)
            .toFixed();
    }

    @ErrorLoggerAsync({
        className: PairComputeService.name,
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'pair',
        remoteTtl: CacheTtlInfo.Price.remoteTtl,
        localTtl: CacheTtlInfo.Price.localTtl,
    })
    async lpTokenPriceUSD(pairAddress: string): Promise<string> {
        return await this.computeLpTokenPriceUSD(pairAddress);
    }

    async computeLpTokenPriceUSD(pairAddress: string): Promise<string> {
        const [secondToken, lpToken, firstTokenPrice] = await Promise.all([
            this.pairService.getSecondToken(pairAddress),
            this.pairService.getLpToken(pairAddress),
            this.firstTokenPrice(pairAddress),
        ]);

        if (lpToken === undefined) {
            return undefined;
        }

        const [secondTokenPriceUSD, lpTokenPosition] = await Promise.all([
            this.tokenCompute.computeTokenPriceDerivedUSD(
                secondToken.identifier,
            ),
            this.pairService.getLiquidityPosition(
                pairAddress,
                new BigNumber(`1e${lpToken.decimals}`).toFixed(),
            ),
        ]);

        const lpTokenPrice = new BigNumber(firstTokenPrice)
            .multipliedBy(new BigNumber(lpTokenPosition.firstTokenAmount))
            .plus(new BigNumber(lpTokenPosition.secondTokenAmount));
        const lpTokenPriceDenom = lpTokenPrice
            .multipliedBy(`1e-${secondToken.decimals}`)
            .toFixed();

        return new BigNumber(lpTokenPriceDenom)
            .multipliedBy(secondTokenPriceUSD)
            .toFixed();
    }

    @ErrorLoggerAsync({
        className: PairComputeService.name,
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'pair',
        remoteTtl: CacheTtlInfo.Price.remoteTtl,
        localTtl: CacheTtlInfo.Price.localTtl,
    })
    async tokenPriceUSD(tokenID: string): Promise<string> {
        return await this.tokenCompute.computeTokenPriceDerivedUSD(tokenID);
    }

    @ErrorLoggerAsync({
        className: PairComputeService.name,
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'pair',
        remoteTtl: CacheTtlInfo.Price.remoteTtl,
        localTtl: CacheTtlInfo.Price.localTtl,
    })
    async firstTokenPriceUSD(pairAddress: string): Promise<string> {
        return await this.computeFirstTokenPriceUSD(pairAddress);
    }

    async computeFirstTokenPriceUSD(pairAddress: string): Promise<string> {
        const [firstTokenID, secondTokenID] = await Promise.all([
            this.pairAbi.firstTokenID(pairAddress),
            this.pairAbi.secondTokenID(pairAddress),
        ]);

        if (firstTokenID === constantsConfig.USDC_TOKEN_ID) {
            const usdcPrice = await this.dataApi.getTokenPrice('USDC');
            return usdcPrice.toFixed();
        }

        if (secondTokenID === constantsConfig.USDC_TOKEN_ID) {
            const [tokenPrice, usdcPrice] = await Promise.all([
                this.computeFirstTokenPrice(pairAddress),
                this.dataApi.getTokenPrice('USDC'),
            ]);
            return new BigNumber(tokenPrice).times(usdcPrice).toFixed();
        }

        return await this.tokenCompute.computeTokenPriceDerivedUSD(
            firstTokenID,
        );
    }

    @ErrorLoggerAsync({
        className: PairComputeService.name,
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'pair',
        remoteTtl: CacheTtlInfo.Price.remoteTtl,
        localTtl: CacheTtlInfo.Price.localTtl,
    })
    async secondTokenPriceUSD(pairAddress: string): Promise<string> {
        return await this.computeSecondTokenPriceUSD(pairAddress);
    }

    async computeSecondTokenPriceUSD(pairAddress: string): Promise<string> {
        const [firstTokenID, secondTokenID] = await Promise.all([
            this.pairAbi.firstTokenID(pairAddress),
            this.pairAbi.secondTokenID(pairAddress),
        ]);

        if (secondTokenID === constantsConfig.USDC_TOKEN_ID) {
            const usdcPrice = await this.dataApi.getTokenPrice('USDC');
            return usdcPrice.toString();
        }

        if (firstTokenID === constantsConfig.USDC_TOKEN_ID) {
            const [tokenPrice, usdcPrice] = await Promise.all([
                this.computeSecondTokenPrice(pairAddress),
                this.dataApi.getTokenPrice('USDC'),
            ]);
            return new BigNumber(tokenPrice).times(usdcPrice).toFixed();
        }

        return await this.tokenCompute.computeTokenPriceDerivedUSD(
            secondTokenID,
        );
    }

    @ErrorLoggerAsync({
        className: PairComputeService.name,
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'pair',
        remoteTtl: CacheTtlInfo.ContractInfo.remoteTtl,
        localTtl: CacheTtlInfo.ContractInfo.localTtl,
    })
    async firstTokenLockedValueUSD(pairAddress: string): Promise<string> {
        const lockedValueUSD = await this.computeFirstTokenLockedValueUSD(
            pairAddress,
        );
        return lockedValueUSD.toFixed();
    }

    async computeFirstTokenLockedValueUSD(
        pairAddress: string,
    ): Promise<BigNumber> {
        const [firstToken, firstTokenPriceUSD, firstTokenReserve] =
            await Promise.all([
                this.pairService.getFirstToken(pairAddress),
                this.firstTokenPriceUSD(pairAddress),
                this.pairAbi.firstTokenReserve(pairAddress),
            ]);

        return new BigNumber(firstTokenReserve)
            .multipliedBy(`1e-${firstToken.decimals}`)
            .multipliedBy(firstTokenPriceUSD);
    }

    @ErrorLoggerAsync({
        className: PairComputeService.name,
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'pair',
        remoteTtl: CacheTtlInfo.ContractInfo.remoteTtl,
        localTtl: CacheTtlInfo.ContractInfo.localTtl,
    })
    async secondTokenLockedValueUSD(pairAddress: string): Promise<string> {
        const lockedValueUSD = await this.computeSecondTokenLockedValueUSD(
            pairAddress,
        );
        return lockedValueUSD.toFixed();
    }

    async computeSecondTokenLockedValueUSD(
        pairAddress: string,
    ): Promise<BigNumber> {
        const [secondToken, secondTokenPriceUSD, secondTokenReserve] =
            await Promise.all([
                this.pairService.getSecondToken(pairAddress),
                this.secondTokenPriceUSD(pairAddress),
                this.pairAbi.secondTokenReserve(pairAddress),
            ]);

        return new BigNumber(secondTokenReserve)
            .multipliedBy(`1e-${secondToken.decimals}`)
            .multipliedBy(secondTokenPriceUSD);
    }

    @ErrorLoggerAsync({
        className: PairComputeService.name,
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'pair',
        remoteTtl: CacheTtlInfo.ContractInfo.remoteTtl,
        localTtl: CacheTtlInfo.ContractInfo.localTtl,
    })
    async lockedValueUSD(pairAddress: string): Promise<string> {
        const lockedValueUSD = await this.computeLockedValueUSD(pairAddress);
        return lockedValueUSD.toFixed();
    }

    async computeLockedValueUSD(pairAddress: string): Promise<BigNumber> {
        const [firstTokenLockedValueUSD, secondTokenLockedValueUSD] =
            await Promise.all([
                this.computeFirstTokenLockedValueUSD(pairAddress),
                this.computeSecondTokenLockedValueUSD(pairAddress),
            ]);

        return new BigNumber(firstTokenLockedValueUSD).plus(
            secondTokenLockedValueUSD,
        );
    }

    @ErrorLoggerAsync({
        className: PairComputeService.name,
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'pair',
        remoteTtl: CacheTtlInfo.Analytics.remoteTtl,
        localTtl: CacheTtlInfo.Analytics.localTtl,
    })
    async firstTokenVolume(pairAddress: string, time: string): Promise<string> {
        return await this.computeFirstTokenVolume(pairAddress, time);
    }

    async computeFirstTokenVolume(
        pairAddress: string,
        time: string,
    ): Promise<string> {
        if (!this.apiConfig.isAWSTimestreamRead()) {
            return '0';
        }
        return await this.analyticsQuery.getAggregatedValue({
            series: pairAddress,
            metric: 'firstTokenVolume',
            time,
        });
    }

    @ErrorLoggerAsync({
        className: PairComputeService.name,
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'pair',
        remoteTtl: CacheTtlInfo.Analytics.remoteTtl,
        localTtl: CacheTtlInfo.Analytics.localTtl,
    })
    async secondTokenVolume(
        pairAddress: string,
        time: string,
    ): Promise<string> {
        return await this.computeSecondTokenVolume(pairAddress, time);
    }

    async computeSecondTokenVolume(
        pairAddress: string,
        time: string,
    ): Promise<string> {
        if (!this.apiConfig.isAWSTimestreamRead()) {
            return '0';
        }
        return await this.analyticsQuery.getAggregatedValue({
            series: pairAddress,
            metric: 'secondTokenVolume',
            time,
        });
    }

    @ErrorLoggerAsync({
        className: PairComputeService.name,
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'pair',
        remoteTtl: CacheTtlInfo.Analytics.remoteTtl,
        localTtl: CacheTtlInfo.Analytics.localTtl,
    })
    async volumeUSD(pairAddress: string, time: string): Promise<string> {
        return await this.computeVolumeUSD(pairAddress, time);
    }

    async computeVolumeUSD(pairAddress: string, time: string): Promise<string> {
        if (!this.apiConfig.isAWSTimestreamRead()) {
            return '0';
        }
        return await this.analyticsQuery.getAggregatedValue({
            series: pairAddress,
            metric: 'volumeUSD',
            time,
        });
    }

    @ErrorLoggerAsync({
        className: PairComputeService.name,
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'pair',
        remoteTtl: CacheTtlInfo.Analytics.remoteTtl,
        localTtl: CacheTtlInfo.Analytics.localTtl,
    })
    async feesUSD(pairAddress: string, time: string): Promise<string> {
        return await this.computeFeesUSD(pairAddress, time);
    }

    async computeFeesUSD(pairAddress: string, time: string): Promise<string> {
        if (!this.apiConfig.isAWSTimestreamRead()) {
            return '0';
        }

        return await this.analyticsQuery.getAggregatedValue({
            series: pairAddress,
            metric: 'feesUSD',
            time,
        });
    }

    @ErrorLoggerAsync({
        className: PairComputeService.name,
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'pair',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async feesAPR(pairAddress: string): Promise<string> {
        return await this.computeFeesAPR(pairAddress);
    }

    async computeFeesAPR(pairAddress: string): Promise<string> {
        const [fees24h, lockedValueUSD, specialFeePercent, totalFeesPercent] =
            await Promise.all([
                this.feesUSD(pairAddress, '24h'),
                this.computeLockedValueUSD(pairAddress),
                this.pairAbi.specialFeePercent(pairAddress),
                this.pairAbi.totalFeePercent(pairAddress),
            ]);

        const actualFees24hBig = new BigNumber(fees24h).multipliedBy(
            new BigNumber(totalFeesPercent - specialFeePercent).div(
                totalFeesPercent,
            ),
        );

        return actualFees24hBig.times(365).div(lockedValueUSD).toFixed();
    }

    @ErrorLoggerAsync({
        className: PairComputeService.name,
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'pair',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async type(pairAddress: string): Promise<string> {
        return await this.computeTypeFromTokens(pairAddress);
    }

    async computeTypeFromTokens(pairAddress: string): Promise<string> {
        const [firstTokenID, secondTokenID] = await Promise.all([
            this.pairAbi.firstTokenID(pairAddress),
            this.pairAbi.secondTokenID(pairAddress),
        ]);

        const [firstTokenType, secondTokenType] = await Promise.all([
            this.tokenService.getEsdtTokenType(firstTokenID),
            this.tokenService.getEsdtTokenType(secondTokenID),
        ]);

        return leastType(firstTokenType, secondTokenType);
    }
}
