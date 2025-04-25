import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { BigNumber } from 'bignumber.js';
import { constantsConfig } from 'src/config';
import { TokenComputeService } from 'src/modules/tokens/services/token.compute.service';
import { MXDataApiService } from 'src/services/multiversx-communication/mx.data.api.service';
import { leastType } from 'src/utils/token.type.compare';
import { PairService } from './pair.service';
import { PairAbiService } from './pair.abi.service';
import { ErrorLoggerAsync } from '@multiversx/sdk-nestjs-common';
import { GetOrSetCache } from 'src/helpers/decorators/caching.decorator';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';
import { AnalyticsQueryService } from 'src/services/analytics/services/analytics.query.service';
import { ApiConfigService } from 'src/helpers/api.config.service';
import { IPairComputeService } from '../interfaces';
import { TokenService } from 'src/modules/tokens/services/token.service';
import { computeValueUSD, denominateAmount } from 'src/utils/token.converters';
import { farmsAddresses, farmType } from 'src/utils/farm.utils';
import { RemoteConfigGetterService } from 'src/modules/remote-config/remote-config.getter.service';
import { StakingProxyAbiService } from 'src/modules/staking-proxy/services/staking.proxy.abi.service';
import { MXApiService } from 'src/services/multiversx-communication/mx.api.service';
import {
    FarmRewardType,
    FarmVersion,
} from 'src/modules/farm/models/farm.model';
import { FarmAbiServiceV2 } from 'src/modules/farm/v2/services/farm.v2.abi.service';
import { FarmComputeServiceV2 } from 'src/modules/farm/v2/services/farm.v2.compute.service';
import { StakingComputeService } from 'src/modules/staking/services/staking.compute.service';
import { CacheService } from 'src/services/caching/cache.service';
import { getAllKeys } from 'src/utils/get.many.utils';
import moment from 'moment';
import { ElasticSearchEventsService } from 'src/services/elastic-search/services/es.events.service';
import { RouterAbiService } from 'src/modules/router/services/router.abi.service';

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
        private readonly farmAbi: FarmAbiServiceV2,
        private readonly remoteConfigGetterService: RemoteConfigGetterService,
        private readonly stakingProxyAbiService: StakingProxyAbiService,
        private readonly apiService: MXApiService,
        private readonly farmCompute: FarmComputeServiceV2,
        private readonly stakingCompute: StakingComputeService,
        private readonly routerAbi: RouterAbiService,
        private readonly cachingService: CacheService,
        private readonly elasticEventsService: ElasticSearchEventsService,
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
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'pair',
        remoteTtl: CacheTtlInfo.Price.remoteTtl,
        localTtl: CacheTtlInfo.Price.localTtl,
    })
    async firstTokenPrice(pairAddress: string): Promise<string> {
        return this.computeFirstTokenPrice(pairAddress);
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

    async getAllFirstTokensPrice(pairAddresses: string[]): Promise<string[]> {
        return getAllKeys<string>(
            this.cachingService,
            pairAddresses,
            'pair.firstTokenPrice',
            this.firstTokenPrice.bind(this),
            CacheTtlInfo.Price,
        );
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'pair',
        remoteTtl: CacheTtlInfo.Price.remoteTtl,
        localTtl: CacheTtlInfo.Price.localTtl,
    })
    async secondTokenPrice(pairAddress: string): Promise<string> {
        return this.computeSecondTokenPrice(pairAddress);
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

    async getAllSecondTokensPrice(pairAddresses: string[]): Promise<string[]> {
        return getAllKeys<string>(
            this.cachingService,
            pairAddresses,
            'pair.secondTokenPrice',
            this.secondTokenPrice.bind(this),
            CacheTtlInfo.Price,
        );
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'pair',
        remoteTtl: CacheTtlInfo.Price.remoteTtl,
        localTtl: CacheTtlInfo.Price.localTtl,
    })
    async lpTokenPriceUSD(pairAddress: string): Promise<string> {
        return this.computeLpTokenPriceUSD(pairAddress);
    }

    async computeLpTokenPriceUSD(pairAddress: string): Promise<string> {
        const [
            firstToken,
            secondToken,
            lpToken,
            firstTokenPriceUSD,
            secondTokenPriceUSD,
        ] = await Promise.all([
            this.pairService.getFirstToken(pairAddress),
            this.pairService.getSecondToken(pairAddress),
            this.pairService.getLpToken(pairAddress),
            this.firstTokenPriceUSD(pairAddress),
            this.secondTokenPriceUSD(pairAddress),
        ]);

        if (lpToken === undefined) {
            return undefined;
        }

        const lpPosition = await this.pairService.getLiquidityPosition(
            pairAddress,
            new BigNumber(`1e${lpToken.decimals}`).toFixed(),
        );

        const firstTokenValueUSD = computeValueUSD(
            lpPosition.firstTokenAmount,
            firstToken.decimals,
            firstTokenPriceUSD,
        );
        const secondTokenValueUSD = computeValueUSD(
            lpPosition.secondTokenAmount,
            secondToken.decimals,
            secondTokenPriceUSD,
        );

        return firstTokenValueUSD.plus(secondTokenValueUSD).toFixed();
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'pair',
        remoteTtl: CacheTtlInfo.Price.remoteTtl,
        localTtl: CacheTtlInfo.Price.localTtl,
    })
    async tokenPriceUSD(tokenID: string): Promise<string> {
        return this.tokenCompute.tokenPriceDerivedUSD(tokenID);
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'pair',
        remoteTtl: CacheTtlInfo.Price.remoteTtl,
        localTtl: CacheTtlInfo.Price.localTtl,
    })
    async firstTokenPriceUSD(pairAddress: string): Promise<string> {
        return this.computeFirstTokenPriceUSD(pairAddress);
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

        return this.tokenCompute.computeTokenPriceDerivedUSD(firstTokenID);
    }

    async getAllFirstTokensPriceUSD(
        pairAddresses: string[],
    ): Promise<string[]> {
        return getAllKeys<string>(
            this.cachingService,
            pairAddresses,
            'pair.firstTokenPriceUSD',
            this.firstTokenPriceUSD.bind(this),
            CacheTtlInfo.Price,
        );
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'pair',
        remoteTtl: CacheTtlInfo.Price.remoteTtl,
        localTtl: CacheTtlInfo.Price.localTtl,
    })
    async secondTokenPriceUSD(pairAddress: string): Promise<string> {
        return this.computeSecondTokenPriceUSD(pairAddress);
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

        return this.tokenCompute.computeTokenPriceDerivedUSD(secondTokenID);
    }

    async getAllSecondTokensPricesUSD(
        pairAddresses: string[],
    ): Promise<string[]> {
        return getAllKeys<string>(
            this.cachingService,
            pairAddresses,
            'pair.secondTokenPriceUSD',
            this.secondTokenPriceUSD.bind(this),
            CacheTtlInfo.Price,
        );
    }

    @ErrorLoggerAsync({
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

    async getAllFirstTokensLockedValueUSD(
        pairAddresses: string[],
    ): Promise<string[]> {
        return getAllKeys(
            this.cachingService,
            pairAddresses,
            'pair.firstTokenLockedValueUSD',
            this.firstTokenLockedValueUSD.bind(this),
            CacheTtlInfo.ContractInfo,
        );
    }

    @ErrorLoggerAsync({
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

    async getAllSecondTokensLockedValueUSD(
        pairAddresses: string[],
    ): Promise<string[]> {
        return getAllKeys(
            this.cachingService,
            pairAddresses,
            'pair.secondTokenLockedValueUSD',
            this.secondTokenLockedValueUSD.bind(this),
            CacheTtlInfo.ContractInfo,
        );
    }

    @ErrorLoggerAsync({
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
        const [
            firstTokenLockedValueUSD,
            secondTokenLockedValueUSD,
            firstTokenID,
            secondTokenID,
            commonTokenIDs,
        ] = await Promise.all([
            this.computeFirstTokenLockedValueUSD(pairAddress),
            this.computeSecondTokenLockedValueUSD(pairAddress),
            this.pairAbi.firstTokenID(pairAddress),
            this.pairAbi.secondTokenID(pairAddress),
            this.routerAbi.commonTokensForUserPairs(),
        ]);

        if (
            commonTokenIDs.includes(firstTokenID) &&
            commonTokenIDs.includes(secondTokenID)
        ) {
            return new BigNumber(firstTokenLockedValueUSD).plus(
                secondTokenLockedValueUSD,
            );
        }

        const state = await this.pairAbi.state(pairAddress);
        if (state === 'Active') {
            return new BigNumber(firstTokenLockedValueUSD).plus(
                secondTokenLockedValueUSD,
            );
        }

        if (commonTokenIDs.includesNone([firstTokenID, secondTokenID])) {
            return new BigNumber(0);
        }

        const commonTokenLockedValueUSD = commonTokenIDs.includes(firstTokenID)
            ? new BigNumber(firstTokenLockedValueUSD)
            : new BigNumber(secondTokenLockedValueUSD);

        return commonTokenLockedValueUSD.multipliedBy(2);
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'pair',
        remoteTtl: CacheTtlInfo.ContractInfo.remoteTtl,
        localTtl: CacheTtlInfo.ContractInfo.localTtl,
    })
    async previous24hLockedValueUSD(pairAddress: string): Promise<string> {
        return this.computePrevious24hLockedValueUSD(pairAddress);
    }

    async computePrevious24hLockedValueUSD(
        pairAddress: string,
    ): Promise<string> {
        const values24h = await this.analyticsQuery.getValues24h({
            series: pairAddress,
            metric: 'lockedValueUSD',
        });

        return values24h[0]?.value ?? undefined;
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'pair',
        remoteTtl: CacheTtlInfo.Analytics.remoteTtl,
        localTtl: CacheTtlInfo.Analytics.localTtl,
    })
    async firstTokenVolume(pairAddress: string): Promise<string> {
        return this.computeFirstTokenVolume(pairAddress, '24h');
    }

    async computeFirstTokenVolume(
        pairAddress: string,
        time: string,
    ): Promise<string> {
        if (!this.apiConfig.isAWSTimestreamRead()) {
            return '0';
        }
        return this.analyticsQuery.getAggregatedValue({
            series: pairAddress,
            metric: 'firstTokenVolume',
            time,
        });
    }

    async getAllFirstTokensVolume(pairAddresses: string[]): Promise<string[]> {
        return getAllKeys(
            this.cachingService,
            pairAddresses,
            'pair.firstTokenVolume',
            this.firstTokenVolume.bind(this),
            CacheTtlInfo.Analytics,
        );
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'pair',
        remoteTtl: CacheTtlInfo.Analytics.remoteTtl,
        localTtl: CacheTtlInfo.Analytics.localTtl,
    })
    async secondTokenVolume(pairAddress: string): Promise<string> {
        return this.computeSecondTokenVolume(pairAddress, '24h');
    }

    async computeSecondTokenVolume(
        pairAddress: string,
        time: string,
    ): Promise<string> {
        if (!this.apiConfig.isAWSTimestreamRead()) {
            return '0';
        }
        return this.analyticsQuery.getAggregatedValue({
            series: pairAddress,
            metric: 'secondTokenVolume',
            time,
        });
    }

    async getAllSecondTokensVolume(pairAddresses: string[]): Promise<string[]> {
        return getAllKeys(
            this.cachingService,
            pairAddresses,
            'pair.secondTokenVolume',
            this.secondTokenVolume.bind(this),
            CacheTtlInfo.Analytics,
        );
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'pair',
        remoteTtl: CacheTtlInfo.Analytics.remoteTtl,
        localTtl: CacheTtlInfo.Analytics.localTtl,
    })
    async volumeUSD(pairAddress: string): Promise<string> {
        return this.computeVolumeUSD(pairAddress, '24h');
    }

    async computeVolumeUSD(pairAddress: string, time: string): Promise<string> {
        if (!this.apiConfig.isAWSTimestreamRead()) {
            return '0';
        }
        return this.analyticsQuery.getAggregatedValue({
            series: pairAddress,
            metric: 'volumeUSD',
            time,
        });
    }

    async getAllVolumeUSD(pairAddresses: string[]): Promise<string[]> {
        return getAllKeys(
            this.cachingService,
            pairAddresses,
            'pair.volumeUSD',
            this.volumeUSD.bind(this),
            CacheTtlInfo.Analytics,
        );
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'pair',
        remoteTtl: CacheTtlInfo.Analytics.remoteTtl,
        localTtl: CacheTtlInfo.Analytics.localTtl,
    })
    async previous24hVolumeUSD(pairAddress: string): Promise<string> {
        return this.computePrevious24hVolumeUSD(pairAddress);
    }

    async computePrevious24hVolumeUSD(pairAddress: string): Promise<string> {
        const [volume24h, volume48h] = await Promise.all([
            this.computeVolumeUSD(pairAddress, '24h'),
            this.computeVolumeUSD(pairAddress, '48h'),
        ]);
        return new BigNumber(volume48h).minus(volume24h).toFixed();
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'pair',
        remoteTtl: CacheTtlInfo.Analytics.remoteTtl,
        localTtl: CacheTtlInfo.Analytics.localTtl,
    })
    async feesUSD(pairAddress: string, time: string): Promise<string> {
        return this.computeFeesUSD(pairAddress, time);
    }

    async computeFeesUSD(pairAddress: string, time: string): Promise<string> {
        if (!this.apiConfig.isAWSTimestreamRead()) {
            return '0';
        }

        return this.analyticsQuery.getAggregatedValue({
            series: pairAddress,
            metric: 'feesUSD',
            time,
        });
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'pair',
        remoteTtl: CacheTtlInfo.Analytics.remoteTtl,
        localTtl: CacheTtlInfo.Analytics.localTtl,
    })
    async previous24hFeesUSD(pairAddress: string): Promise<string> {
        return this.computePrevious24hFeesUSD(pairAddress);
    }

    async computePrevious24hFeesUSD(pairAddress: string): Promise<string> {
        const [fees24h, fees48h] = await Promise.all([
            this.feesUSD(pairAddress, '24h'),
            this.feesUSD(pairAddress, '48h'),
        ]);
        return new BigNumber(fees48h).minus(fees24h).toFixed();
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'pair',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async feesAPR(pairAddress: string): Promise<string> {
        return this.computeFeesAPR(pairAddress);
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

        const feesAPR = actualFees24hBig.times(365).div(lockedValueUSD);

        return !feesAPR.isNaN() ? feesAPR.toFixed() : '0';
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'pair',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async type(pairAddress: string): Promise<string> {
        return this.computeTypeFromTokens(pairAddress);
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

    async computePermanentLockedValueUSD(
        pairAddress: string,
        firstTokenAmount: BigNumber,
        secondTokenAmount: BigNumber,
    ): Promise<BigNumber> {
        const [
            firstToken,
            secondToken,
            firstTokenPriceUSD,
            secondTokenPriceUSD,
        ] = await Promise.all([
            this.pairService.getFirstToken(pairAddress),
            this.pairService.getSecondToken(pairAddress),
            this.firstTokenPriceUSD(pairAddress),
            this.secondTokenPriceUSD(pairAddress),
        ]);

        const minimumAmount = firstTokenAmount.isLessThan(secondTokenAmount)
            ? firstTokenAmount
            : secondTokenAmount;
        const minimumLiquidity = new BigNumber(10 ** 3);

        const firstTokenAmountDenom = denominateAmount(
            firstTokenAmount.toFixed(),
            firstToken.decimals,
        );
        const secondTokenAmountDenom = denominateAmount(
            secondTokenAmount.toFixed(),
            secondToken.decimals,
        );

        if (minimumAmount.isEqualTo(firstTokenAmount)) {
            const minimumLiquidityDenom = denominateAmount(
                minimumLiquidity.toFixed(),
                firstToken.decimals,
            );
            if (new BigNumber(firstTokenPriceUSD).isGreaterThan(0)) {
                return minimumLiquidityDenom.multipliedBy(firstTokenPriceUSD);
            }

            const firstTokenPrice = secondTokenAmountDenom.dividedBy(
                firstTokenAmountDenom,
            );
            return minimumLiquidityDenom
                .multipliedBy(firstTokenPrice)
                .multipliedBy(secondTokenPriceUSD);
        } else {
            const minimumLiquidityDenom = denominateAmount(
                minimumLiquidity.toFixed(),
                secondToken.decimals,
            );

            if (new BigNumber(secondTokenPriceUSD).isGreaterThan(0)) {
                return minimumLiquidityDenom.multipliedBy(secondTokenPriceUSD);
            }
            const secondTokenPrice = firstTokenAmountDenom.dividedBy(
                secondTokenAmountDenom,
            );

            return minimumLiquidityDenom
                .multipliedBy(secondTokenPrice)
                .multipliedBy(firstTokenPriceUSD);
        }
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'pair',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async hasFarms(pairAddress: string): Promise<boolean> {
        return this.computeHasFarms(pairAddress);
    }

    async computeHasFarms(pairAddress: string): Promise<boolean> {
        const addresses: string[] = farmsAddresses([FarmVersion.V2]).filter(
            (address) => farmType(address) !== FarmRewardType.DEPRECATED,
        );
        const lpTokenID = await this.pairAbi.lpTokenID(pairAddress);

        const farmingTokenIDs = await Promise.all(
            addresses.map((address) => this.farmAbi.farmingTokenID(address)),
        );

        return farmingTokenIDs.includes(lpTokenID);
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'pair',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async hasDualFarms(pairAddress: string): Promise<boolean> {
        return this.computeHasDualFarms(pairAddress);
    }

    async computeHasDualFarms(pairAddress: string): Promise<boolean> {
        const stakingProxyAddresses =
            await this.remoteConfigGetterService.getStakingProxyAddresses();

        const pairAddresses = await Promise.all(
            stakingProxyAddresses.map((address) =>
                this.stakingProxyAbiService.pairAddress(address),
            ),
        );

        return pairAddresses.includes(pairAddress);
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'pair',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async tradesCount(pairAddress: string): Promise<number> {
        return this.computeTradesCount(pairAddress);
    }

    async computeTradesCount(pairAddress: string): Promise<number> {
        return this.elasticEventsService.getPairSwapCount(pairAddress);
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'pair',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async tradesCount24h(pairAddress: string): Promise<number> {
        return this.computeTradesCount24h(pairAddress);
    }

    async computeTradesCount24h(pairAddress: string): Promise<number> {
        const end = moment.utc().unix();
        const start = moment.unix(end).subtract(1, 'day').unix();

        return this.elasticEventsService.getPairSwapCount(
            pairAddress,
            start,
            end,
        );
    }

    async getAllTradesCount24h(pairAddresses: string[]): Promise<number[]> {
        return getAllKeys(
            this.cachingService,
            pairAddresses,
            'pair.tradesCount24h',
            this.tradesCount24h.bind(this),
            CacheTtlInfo.ContractState,
        );
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'pair',
        remoteTtl: CacheTtlInfo.ContractState.remoteTtl,
        localTtl: CacheTtlInfo.ContractState.localTtl,
    })
    async deployedAt(pairAddress: string): Promise<number> {
        return this.computeDeployedAt(pairAddress);
    }

    async computeDeployedAt(pairAddress: string): Promise<number> {
        const { deployedAt } = await this.apiService.getAccountStats(
            pairAddress,
        );
        return deployedAt ?? undefined;
    }

    async getPairFarmAddress(pairAddress: string): Promise<string> {
        const hasFarms = await this.hasFarms(pairAddress);

        if (!hasFarms) {
            return undefined;
        }

        const addresses: string[] = farmsAddresses([FarmVersion.V2]).filter(
            (address) => farmType(address) !== FarmRewardType.DEPRECATED,
        );

        const lpTokenID = await this.pairAbi.lpTokenID(pairAddress);

        const farmingTokenIDs = await Promise.all(
            addresses.map((address) => this.farmAbi.farmingTokenID(address)),
        );

        const farmAddressIndex = farmingTokenIDs.findIndex(
            (tokenID) => tokenID === lpTokenID,
        );

        if (farmAddressIndex === -1) {
            return undefined;
        }

        return addresses[farmAddressIndex];
    }

    async getPairFarmToken(pairAddress: string): Promise<string> {
        const farmAddress = await this.getPairFarmAddress(pairAddress);

        if (!farmAddress) {
            return undefined;
        }

        return this.farmAbi.farmTokenID(farmAddress);
    }

    async getPairStakingFarmAddress(pairAddress: string): Promise<string> {
        const stakingProxyAddress = await this.getPairStakingProxyAddress(
            pairAddress,
        );

        if (!stakingProxyAddress) {
            return undefined;
        }

        return this.stakingProxyAbiService.stakingFarmAddress(
            stakingProxyAddress,
        );
    }

    async getPairStakingProxyAddress(pairAddress: string): Promise<string> {
        const hasDualFarms = await this.hasDualFarms(pairAddress);

        if (!hasDualFarms) {
            return undefined;
        }

        const stakingProxyAddresses =
            await this.remoteConfigGetterService.getStakingProxyAddresses();
        const farmAddress = await this.getPairFarmAddress(pairAddress);

        const farmsAddresses = await Promise.all(
            stakingProxyAddresses.map((address) =>
                this.stakingProxyAbiService.lpFarmAddress(address),
            ),
        );

        const stakingProxyIndex = farmsAddresses.findIndex(
            (address) => address === farmAddress,
        );

        return stakingProxyIndex === -1
            ? undefined
            : stakingProxyAddresses[stakingProxyIndex];
    }

    async computeCompoundedApr(pairAddress: string): Promise<string> {
        const [feesAPR, farmAddress, stakingFarmAddress] = await Promise.all([
            this.feesAPR(pairAddress),
            this.getPairFarmAddress(pairAddress),
            this.getPairStakingFarmAddress(pairAddress),
        ]);

        let feesAprBN = new BigNumber(feesAPR);
        let farmBaseAprBN = new BigNumber('0');
        let farmBoostedAprBN = new BigNumber('0');
        let dualFarmBaseAprBN = new BigNumber('0');
        let dualFarmBoostedAprBN = new BigNumber('0');

        if (farmAddress) {
            const [farmBaseAPR, farmBoostedAPR] = await Promise.all([
                this.farmCompute.farmBaseAPR(farmAddress),
                this.farmCompute.maxBoostedApr(farmAddress),
            ]);

            farmBaseAprBN = new BigNumber(farmBaseAPR);
            farmBoostedAprBN = new BigNumber(farmBoostedAPR);

            if (farmBaseAprBN.isNaN() || !farmBaseAprBN.isFinite()) {
                farmBaseAprBN = new BigNumber(0);
            }
            if (farmBoostedAprBN.isNaN() || !farmBoostedAprBN.isFinite()) {
                farmBoostedAprBN = new BigNumber(0);
            }
        }

        if (stakingFarmAddress) {
            const [dualFarmBaseAPR, dualFarmBoostedAPR] = await Promise.all([
                this.stakingCompute.stakeFarmAPR(stakingFarmAddress),
                this.stakingCompute.boostedAPR(stakingFarmAddress),
            ]);

            dualFarmBaseAprBN = new BigNumber(dualFarmBaseAPR);
            dualFarmBoostedAprBN = new BigNumber(dualFarmBoostedAPR);

            if (dualFarmBaseAprBN.isNaN() || !dualFarmBaseAprBN.isFinite()) {
                dualFarmBaseAprBN = new BigNumber(0);
            }
            if (
                dualFarmBoostedAprBN.isNaN() ||
                !dualFarmBoostedAprBN.isFinite()
            ) {
                dualFarmBoostedAprBN = new BigNumber(0);
            }
        }

        if (feesAprBN.isNaN() || !feesAprBN.isFinite()) {
            feesAprBN = new BigNumber(0);
        }

        return feesAprBN
            .plus(farmBaseAprBN)
            .plus(farmBoostedAprBN)
            .plus(dualFarmBaseAprBN)
            .plus(dualFarmBoostedAprBN)
            .toFixed();
    }
}
