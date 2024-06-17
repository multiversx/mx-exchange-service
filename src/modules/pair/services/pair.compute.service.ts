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
import { farmsAddresses } from 'src/utils/farm.utils';
import { RemoteConfigGetterService } from 'src/modules/remote-config/remote-config.getter.service';
import { StakingProxyAbiService } from 'src/modules/staking-proxy/services/staking.proxy.abi.service';
import { ElasticService } from 'src/helpers/elastic.service';
import { ElasticQuery, QueryType } from '@multiversx/sdk-nestjs-elastic';
import { MXApiService } from 'src/services/multiversx-communication/mx.api.service';
import { FarmVersion } from 'src/modules/farm/models/farm.model';
import { FarmAbiServiceV2 } from 'src/modules/farm/v2/services/farm.v2.abi.service';
import { TransactionStatus } from 'src/utils/transaction.utils';

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
        private readonly elasticService: ElasticService,
        private readonly apiService: MXApiService,
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

    @ErrorLoggerAsync({
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
        const addresses: string[] = farmsAddresses([FarmVersion.V2]);
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
        const elasticQueryAdapter: ElasticQuery = new ElasticQuery();

        elasticQueryAdapter.condition.must = [
            QueryType.Match('receiver', pairAddress),
            QueryType.Match('status', TransactionStatus.success),
            QueryType.Should([
                QueryType.Match('function', 'swapTokensFixedInput'),
                QueryType.Match('function', 'swapTokensFixedOutput'),
            ]),
        ];

        return await this.elasticService.getCount(
            'transactions',
            elasticQueryAdapter,
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

        const addresses: string[] = farmsAddresses([FarmVersion.V2]);
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

    async getPairStakingFarmAddress(pairAddress: string): Promise<string> {
        const hasDualFarms = await this.hasDualFarms(pairAddress);

        if (!hasDualFarms) {
            return undefined;
        }

        const stakingProxyAddresses =
            await this.remoteConfigGetterService.getStakingProxyAddresses();

        const pairAddresses = await Promise.all(
            stakingProxyAddresses.map((address) =>
                this.stakingProxyAbiService.pairAddress(address),
            ),
        );

        const stakingProxyIndex = pairAddresses.findIndex(
            (address) => address === pairAddress,
        );

        if (stakingProxyIndex === -1) {
            return undefined;
        }

        return await this.stakingProxyAbiService.stakingFarmAddress(
            stakingProxyAddresses[stakingProxyIndex],
        );
    }
}
