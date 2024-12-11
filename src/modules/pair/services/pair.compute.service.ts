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
import { CacheService } from '@multiversx/sdk-nestjs-cache';
import { getAllKeys } from 'src/utils/get.many.utils';
import { ESTransactionsService } from 'src/services/elastic-search/services/es.transactions.service';
import moment from 'moment';

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
        private readonly cachingService: CacheService,
        private readonly elasticTransactionsService: ESTransactionsService,
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

    async getAllFirstTokensPrice(pairAddresses: string[]): Promise<string[]> {
        return await getAllKeys<string>(
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

    async getAllSecondTokensPrice(pairAddresses: string[]): Promise<string[]> {
        return await getAllKeys<string>(
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
        return await this.computeLpTokenPriceUSD(pairAddress);
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

    async getAllLpTokensPriceUSD(pairAddresses: string[]): Promise<string[]> {
        return await getAllKeys<string>(
            this.cachingService,
            pairAddresses,
            'pair.lpTokenPriceUSD',
            this.lpTokenPriceUSD.bind(this),
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
    async tokenPriceUSD(tokenID: string): Promise<string> {
        return await this.tokenCompute.tokenPriceDerivedUSD(tokenID);
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

    async getAllFirstTokensPriceUSD(
        pairAddresses: string[],
    ): Promise<string[]> {
        return await getAllKeys<string>(
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

    async getAllSecondTokensPricesUSD(
        pairAddresses: string[],
    ): Promise<string[]> {
        return await getAllKeys<string>(
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
        return await getAllKeys<string>(
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
        return await getAllKeys<string>(
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
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'pair',
        remoteTtl: CacheTtlInfo.ContractInfo.remoteTtl,
        localTtl: CacheTtlInfo.ContractInfo.localTtl,
    })
    async previous24hLockedValueUSD(pairAddress: string): Promise<string> {
        return await this.computePrevious24hLockedValueUSD(pairAddress);
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

    async getAllPrevious24hLockedValueUSD(
        pairAddresses: string[],
    ): Promise<string[]> {
        return await getAllKeys<string>(
            this.cachingService,
            pairAddresses,
            'pair.previous24hLockedValueUSD',
            this.previous24hLockedValueUSD.bind(this),
            CacheTtlInfo.ContractInfo,
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
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'pair',
        remoteTtl: CacheTtlInfo.Analytics.remoteTtl,
        localTtl: CacheTtlInfo.Analytics.localTtl,
    })
    async volumeUSD(pairAddress: string): Promise<string> {
        return await this.computeVolumeUSD(pairAddress, '24h');
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

    async getAllVolumeUSD(pairAddresses: string[]): Promise<string[]> {
        return await getAllKeys(
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
        return await this.computePrevious24hVolumeUSD(pairAddress);
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
    async feesUSD(pairAddress: string): Promise<string> {
        return await this.computeFeesUSD(pairAddress, '24h');
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

    async getAllFeesUSD(pairAddresses: string[]): Promise<string[]> {
        return await getAllKeys(
            this.cachingService,
            pairAddresses,
            'pair.feesUSD',
            this.feesUSD.bind(this),
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
    async previous24hFeesUSD(pairAddress: string): Promise<string> {
        return await this.computePrevious24hFeesUSD(pairAddress);
    }

    async computePrevious24hFeesUSD(pairAddress: string): Promise<string> {
        const [fees24h, fees48h] = await Promise.all([
            this.computeFeesUSD(pairAddress, '24h'),
            this.computeFeesUSD(pairAddress, '48h'),
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
        return await this.computeFeesAPR(pairAddress);
    }

    async computeFeesAPR(pairAddress: string): Promise<string> {
        const [fees24h, lockedValueUSD, specialFeePercent, totalFeesPercent] =
            await Promise.all([
                this.feesUSD(pairAddress),
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

    async getAllFeesAPR(pairAddresses: string[]): Promise<string[]> {
        return await getAllKeys<string>(
            this.cachingService,
            pairAddresses,
            'pair.feesAPR',
            this.feesAPR.bind(this),
            CacheTtlInfo.ContractInfo,
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

    async getAllType(pairAddresses: string[]): Promise<string[]> {
        return await getAllKeys<string>(
            this.cachingService,
            pairAddresses,
            'pair.type',
            this.type.bind(this),
            CacheTtlInfo.ContractState,
        );
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
        return await this.computeHasFarms(pairAddress);
    }

    async computeHasFarms(pairAddress: string): Promise<boolean> {
        const addresses: string[] = farmsAddresses([FarmVersion.V2]).filter(
            (address) => farmType(address) !== FarmRewardType.DEPRECATED,
        );
        const lpTokenID = await this.pairAbi.lpTokenID(pairAddress);

        const farmingTokenIDs = await this.farmAbi.getAllFarmingTokenIds(
            addresses,
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
        return await this.computeHasDualFarms(pairAddress);
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
        return await this.computeTradesCount(pairAddress);
    }

    async computeTradesCount(pairAddress: string): Promise<number> {
        return await this.elasticTransactionsService.computePairSwapCount(
            pairAddress,
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
    async tradesCount24h(pairAddress: string): Promise<number> {
        return await this.computeTradesCount24h(pairAddress);
    }

    async computeTradesCount24h(pairAddress: string): Promise<number> {
        const end = moment.utc().unix();
        const start = moment.unix(end).subtract(1, 'day').unix();

        return await this.elasticTransactionsService.computePairSwapCount(
            pairAddress,
            start,
            end,
        );
    }

    async getAllTradesCount24h(pairAddresses: string[]): Promise<number[]> {
        return await getAllKeys(
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
        return await this.computeDeployedAt(pairAddress);
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

        const farmingTokenIDs = await this.farmAbi.getAllFarmingTokenIds(
            addresses,
        );

        const farmAddressIndex = farmingTokenIDs.findIndex(
            (tokenID) => tokenID === lpTokenID,
        );

        if (farmAddressIndex === -1) {
            return undefined;
        }

        return addresses[farmAddressIndex];
    }

    async getAllPairsFarmAddress(pairAddresses: string[]): Promise<string[]> {
        const farmAddresses = farmsAddresses([FarmVersion.V2]).filter(
            (address) => farmType(address) !== FarmRewardType.DEPRECATED,
        );
        const farmingTokenIds = await this.farmAbi.getAllFarmingTokenIds(
            farmAddresses,
        );
        const allLpTokenIDs = await this.pairService.getAllLpTokensIds(
            pairAddresses,
        );

        return allLpTokenIDs.map((lpTokenID) => {
            const farmAddressIndex = farmingTokenIds.findIndex(
                (tokenID) => tokenID === lpTokenID,
            );

            if (farmAddressIndex === -1) {
                return undefined;
            }

            return farmAddresses[farmAddressIndex];
        });
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

        return await this.stakingProxyAbiService.stakingFarmAddress(
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

    async getAllPairsStakingProxyAddress(
        pairAddresses: string[],
    ): Promise<string[]> {
        const stakingProxyAddresses =
            await this.remoteConfigGetterService.getStakingProxyAddresses();

        const stakingProxyPairAddresses =
            await this.stakingProxyAbiService.getAllPairAddresses(
                stakingProxyAddresses,
            );
        const allFarmAddresses = await this.getAllPairsFarmAddress(
            pairAddresses,
        );

        const allLpFarmAddresses =
            await this.stakingProxyAbiService.getAllLpFarmAddresses(
                stakingProxyAddresses,
            );

        return pairAddresses.map((pairAddress, index) => {
            if (
                !stakingProxyPairAddresses.includes(pairAddress) ||
                allFarmAddresses[index] === undefined
            ) {
                return undefined;
            }

            const stakingProxyIndex = allLpFarmAddresses.findIndex(
                (address) => address === allFarmAddresses[index],
            );

            return stakingProxyIndex === -1
                ? undefined
                : stakingProxyAddresses[stakingProxyIndex];
        });
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
