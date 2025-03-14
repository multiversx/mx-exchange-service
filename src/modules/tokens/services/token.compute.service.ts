import { forwardRef, Inject, Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import {
    constantsConfig,
    mxConfig,
    scAddress,
    tokenProviderUSD,
} from 'src/config';
import { PairMetadata } from 'src/modules/router/models/pair.metadata.model';
import { MXDataApiService } from 'src/services/multiversx-communication/mx.data.api.service';
import { ITokenComputeService } from '../interfaces';
import { PairAbiService } from 'src/modules/pair/services/pair.abi.service';
import { PairComputeService } from 'src/modules/pair/services/pair.compute.service';
import { PairService } from 'src/modules/pair/services/pair.service';
import { RouterAbiService } from 'src/modules/router/services/router.abi.service';
import { ErrorLoggerAsync } from '@multiversx/sdk-nestjs-common';
import { GetOrSetCache } from 'src/helpers/decorators/caching.decorator';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';
import { AnalyticsQueryService } from 'src/services/analytics/services/analytics.query.service';
import {
    ElasticQuery,
    ElasticService,
    QueryType,
} from '@multiversx/sdk-nestjs-elastic';
import moment from 'moment';
import { PendingExecutor } from 'src/utils/pending.executor';
import { CacheService } from 'src/services/caching/cache.service';
import { TokenService } from './token.service';
import { getAllKeys } from 'src/utils/get.many.utils';
import { ElasticSearchEventsService } from 'src/services/elastic-search/services/es.events.service';

@Injectable()
export class TokenComputeService implements ITokenComputeService {
    private swapCountExecutor: PendingExecutor<
        null,
        { tokenID: string; swapsCount: number }[]
    >;
    private swapCountPrevious24hExecutor: PendingExecutor<
        null,
        { tokenID: string; swapsCount: number }[]
    >;

    constructor(
        @Inject(forwardRef(() => TokenService))
        private readonly tokenService: TokenService,
        private readonly pairAbi: PairAbiService,
        @Inject(forwardRef(() => PairComputeService))
        private readonly pairCompute: PairComputeService,
        @Inject(forwardRef(() => PairService))
        private readonly pairService: PairService,
        private readonly routerAbi: RouterAbiService,
        private readonly dataApi: MXDataApiService,
        private readonly analyticsQuery: AnalyticsQueryService,
        private readonly elasticService: ElasticService,
        private readonly cachingService: CacheService,
        private readonly elasticEventsService: ElasticSearchEventsService,
    ) {
        this.swapCountExecutor = new PendingExecutor(
            async () => await this.allTokensSwapsCount(),
        );
        this.swapCountPrevious24hExecutor = new PendingExecutor(
            async () => await this.allTokensSwapsCountPrevious24h(),
        );
    }

    async getEgldPriceInUSD(): Promise<string> {
        return this.pairCompute.firstTokenPrice(scAddress.WEGLD_USDC);
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'token',
        remoteTtl: CacheTtlInfo.Price.remoteTtl,
        localTtl: CacheTtlInfo.Price.localTtl,
    })
    async tokenPriceDerivedEGLD(tokenID: string): Promise<string> {
        return this.computeTokenPriceDerivedEGLD(tokenID, []);
    }

    async computeTokenPriceDerivedEGLD(
        tokenID: string,
        pairsNotToVisit: PairMetadata[],
    ): Promise<string> {
        if (tokenID === tokenProviderUSD) {
            return new BigNumber('1').toFixed();
        }

        const pairsMetadata = await this.routerAbi.pairsMetadata();
        let tokenPairs: PairMetadata[] = [];
        for (const pair of pairsMetadata) {
            if (
                pair.firstTokenID === tokenID ||
                pair.secondTokenID === tokenID
            ) {
                tokenPairs.push(pair);
            }
        }

        if (tokenPairs.length > 1) {
            const states = await Promise.all(
                tokenPairs.map((pair) => this.pairAbi.state(pair.address)),
            );
            if (states.find((state) => state === 'Active')) {
                tokenPairs = tokenPairs.filter((pair, index) => {
                    return states[index] === 'Active';
                });
            }
        }

        tokenPairs = tokenPairs.filter(
            (pair) =>
                pairsNotToVisit.find(
                    (pairNotToVisit) => pairNotToVisit.address === pair.address,
                ) === undefined,
        );

        pairsNotToVisit.push(...tokenPairs);

        let largestLiquidityEGLD = new BigNumber(0);
        let priceSoFar = '0';

        if (tokenID === constantsConfig.USDC_TOKEN_ID) {
            const eglpPriceUSD = await this.getEgldPriceInUSD();
            priceSoFar = new BigNumber(1).dividedBy(eglpPriceUSD).toFixed();
        } else {
            for (const pair of tokenPairs) {
                const liquidity = await this.pairAbi.totalSupply(pair.address);
                if (new BigNumber(liquidity).isGreaterThan(0)) {
                    if (pair.firstTokenID === tokenID) {
                        const [
                            secondTokenDerivedEGLD,
                            secondTokenReserves,
                            firstTokenPrice,
                            secondToken,
                        ] = await Promise.all([
                            this.computeTokenPriceDerivedEGLD(
                                pair.secondTokenID,
                                pairsNotToVisit,
                            ),
                            this.pairAbi.secondTokenReserve(pair.address),
                            this.pairCompute.firstTokenPrice(pair.address),
                            this.pairService.getSecondToken(pair.address),
                        ]);
                        const egldLocked = new BigNumber(secondTokenReserves)
                            .times(`1e-${secondToken.decimals}`)
                            .times(secondTokenDerivedEGLD)
                            .times(`1e${mxConfig.EGLDDecimals}`)
                            .integerValue();

                        if (egldLocked.isGreaterThan(largestLiquidityEGLD)) {
                            largestLiquidityEGLD = egldLocked;
                            priceSoFar = new BigNumber(firstTokenPrice)
                                .times(secondTokenDerivedEGLD)
                                .toFixed();
                        }
                    }
                    if (pair.secondTokenID === tokenID) {
                        const [
                            firstTokenDerivedEGLD,
                            firstTokenReserves,
                            secondTokenPrice,
                            firstToken,
                        ] = await Promise.all([
                            this.computeTokenPriceDerivedEGLD(
                                pair.firstTokenID,
                                pairsNotToVisit,
                            ),
                            this.pairAbi.firstTokenReserve(pair.address),
                            this.pairCompute.secondTokenPrice(pair.address),
                            this.pairService.getFirstToken(pair.address),
                        ]);
                        const egldLocked = new BigNumber(firstTokenReserves)
                            .times(`1e-${firstToken.decimals}`)
                            .times(firstTokenDerivedEGLD)
                            .times(`1e${mxConfig.EGLDDecimals}`)
                            .integerValue();
                        if (egldLocked.isGreaterThan(largestLiquidityEGLD)) {
                            largestLiquidityEGLD = egldLocked;
                            priceSoFar = new BigNumber(secondTokenPrice)
                                .times(firstTokenDerivedEGLD)
                                .toFixed();
                        }
                    }
                }
            }
        }
        return priceSoFar;
    }

    async getAllTokensPriceDerivedEGLD(tokenIDs: string[]): Promise<string[]> {
        return getAllKeys(
            this.cachingService,
            tokenIDs,
            'token.tokenPriceDerivedEGLD',
            this.tokenPriceDerivedEGLD.bind(this),
            CacheTtlInfo.Price,
        );
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'token',
        remoteTtl: CacheTtlInfo.Price.remoteTtl,
        localTtl: CacheTtlInfo.Price.localTtl,
    })
    async tokenPriceDerivedUSD(tokenID: string): Promise<string> {
        return this.computeTokenPriceDerivedUSD(tokenID);
    }

    async computeTokenPriceDerivedUSD(tokenID: string): Promise<string> {
        const pairAddress = await this.pairService.getPairAddressByLpTokenID(
            tokenID,
        );

        if (pairAddress) {
            return this.pairCompute.lpTokenPriceUSD(pairAddress);
        }

        const [egldPriceUSD, derivedEGLD, usdcPrice] = await Promise.all([
            this.getEgldPriceInUSD(),
            this.computeTokenPriceDerivedEGLD(tokenID, []),
            this.dataApi.getTokenPrice('USDC'),
        ]);

        return new BigNumber(derivedEGLD)
            .times(egldPriceUSD)
            .times(usdcPrice)
            .toFixed();
    }

    async getAllTokensPriceDerivedUSD(tokenIDs: string[]): Promise<string[]> {
        return getAllKeys(
            this.cachingService,
            tokenIDs,
            'token.tokenPriceDerivedUSD',
            this.tokenPriceDerivedUSD.bind(this),
            CacheTtlInfo.Price,
        );
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'token',
        remoteTtl: CacheTtlInfo.TokenAnalytics.remoteTtl,
        localTtl: CacheTtlInfo.TokenAnalytics.localTtl,
    })
    async tokenPrevious24hPrice(tokenID: string): Promise<string> {
        return this.computeTokenPrevious24hPrice(tokenID);
    }

    async computeTokenPrevious24hPrice(tokenID: string): Promise<string> {
        const values24h = await this.analyticsQuery.getValues24h({
            series: tokenID,
            metric: 'priceUSD',
        });
        if (values24h.length > 0 && values24h[0]?.value === '0') {
            return this.computeMissingPrevious24hPrice(tokenID);
        }
        return values24h[0]?.value ?? undefined;
    }

    async computeMissingPrevious24hPrice(tokenID: string): Promise<string> {
        const [wrappedEGLDPrev24hPrice, derivedEGLD] = await Promise.all([
            this.tokenPrevious24hPrice(tokenProviderUSD),
            this.tokenPriceDerivedEGLD(tokenID),
        ]);

        return new BigNumber(derivedEGLD)
            .times(wrappedEGLDPrev24hPrice)
            .toFixed();
    }

    async getAllTokensPrevious24hPrice(tokenIDs: string[]): Promise<string[]> {
        return getAllKeys(
            this.cachingService,
            tokenIDs,
            'token.tokenPrevious24hPrice',
            this.tokenPrevious24hPrice.bind(this),
            CacheTtlInfo.TokenAnalytics,
        );
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'token',
        remoteTtl: CacheTtlInfo.TokenAnalytics.remoteTtl,
        localTtl: CacheTtlInfo.TokenAnalytics.localTtl,
    })
    async tokenPrevious7dPrice(tokenID: string): Promise<string> {
        return this.computeTokenPrevious7dPrice(tokenID);
    }

    async computeTokenPrevious7dPrice(tokenID: string): Promise<string> {
        const values7d = await this.analyticsQuery.getLatestCompleteValues({
            series: tokenID,
            metric: 'priceUSD',
            time: '7 days',
        });

        return values7d[0]?.value ?? undefined;
    }

    async getAllTokensPrevious7dPrice(tokenIDs: string[]): Promise<string[]> {
        return getAllKeys(
            this.cachingService,
            tokenIDs,
            'token.tokenPrevious7dPrice',
            this.tokenPrevious7dPrice.bind(this),
            CacheTtlInfo.TokenAnalytics,
        );
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'token',
        remoteTtl: CacheTtlInfo.Token.remoteTtl,
        localTtl: CacheTtlInfo.Token.localTtl,
    })
    async tokenPriceChange24h(tokenID: string): Promise<number> {
        return this.computeTokenPriceChange24h(tokenID);
    }

    async computeTokenPriceChange24h(tokenID: string): Promise<number> {
        const [currentPrice, previous24hPrice] = await Promise.all([
            this.tokenPriceDerivedUSD(tokenID),
            this.tokenPrevious24hPrice(tokenID),
        ]);

        const currentPriceBN = new BigNumber(currentPrice);
        const previous24hPriceBN = new BigNumber(previous24hPrice);

        if (previous24hPriceBN.isZero() || previous24hPrice === undefined) {
            return 0;
        }

        return currentPriceBN.dividedBy(previous24hPriceBN).toNumber();
    }

    async computeTokenPriceChange7d(tokenID: string): Promise<number> {
        const [currentPrice, previous7dPrice] = await Promise.all([
            this.tokenPriceDerivedUSD(tokenID),
            this.tokenPrevious7dPrice(tokenID),
        ]);

        const currentPriceBN = new BigNumber(currentPrice);
        const previous7dPriceBN = new BigNumber(previous7dPrice);

        if (previous7dPriceBN.isZero()) {
            return 0;
        }

        return currentPriceBN.dividedBy(previous7dPriceBN).toNumber();
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'token',
        remoteTtl: CacheTtlInfo.Token.remoteTtl,
        localTtl: CacheTtlInfo.Token.localTtl,
    })
    async tokenVolumeUSDChange24h(tokenID: string): Promise<number> {
        return this.computeTokenVolumeUSDChange24h(tokenID);
    }

    async computeTokenVolumeUSDChange24h(tokenID: string): Promise<number> {
        const [currentVolume, previous24hVolume] = await Promise.all([
            this.tokenVolumeUSD24h(tokenID),
            this.tokenPrevious24hVolumeUSD(tokenID),
        ]);

        const currentVolumeBN = new BigNumber(currentVolume);
        const previous24hVolumeBN = new BigNumber(previous24hVolume);

        if (currentVolumeBN.isZero()) {
            return 0;
        }

        const maxPrevious24hVolume = BigNumber.maximum(
            previous24hVolumeBN,
            constantsConfig.trendingScore.MIN_24H_VOLUME,
        );

        return currentVolumeBN.dividedBy(maxPrevious24hVolume).toNumber();
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'token',
        remoteTtl: CacheTtlInfo.Token.remoteTtl,
        localTtl: CacheTtlInfo.Token.localTtl,
    })
    async tokenTradeChange24h(tokenID: string): Promise<number> {
        return this.computeTokenTradeChange24h(tokenID);
    }

    async computeTokenTradeChange24h(tokenID: string): Promise<number> {
        const [currentSwaps, previous24hSwaps] = await Promise.all([
            this.tokenSwapCount(tokenID),
            this.tokenPrevious24hSwapCount(tokenID),
        ]);

        const currentSwapsBN = new BigNumber(currentSwaps);
        const previous24hSwapsBN = new BigNumber(previous24hSwaps);

        const maxPrevious24hTradeCount = BigNumber.maximum(
            previous24hSwapsBN,
            constantsConfig.trendingScore.MIN_24H_TRADE_COUNT,
        );

        return currentSwapsBN.dividedBy(maxPrevious24hTradeCount).toNumber();
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'token',
        remoteTtl: CacheTtlInfo.Token.remoteTtl,
        localTtl: CacheTtlInfo.Token.localTtl,
    })
    async tokenVolumeUSD24h(tokenID: string): Promise<string> {
        return this.computeTokenVolumeUSD24h(tokenID);
    }

    async computeTokenVolumeUSD24h(tokenID: string): Promise<string> {
        const valuesLast2Days = await this.tokenLast2DaysVolumeUSD(tokenID);
        return valuesLast2Days.current;
    }

    async getAllTokensVolumeUSD24h(tokenIDs: string[]): Promise<string[]> {
        return getAllKeys(
            this.cachingService,
            tokenIDs,
            'token.tokenVolumeUSD24h',
            this.tokenVolumeUSD24h.bind(this),
            CacheTtlInfo.Token,
        );
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'token',
        remoteTtl: CacheTtlInfo.Token.remoteTtl,
        localTtl: CacheTtlInfo.Token.localTtl,
    })
    async tokenPrevious24hVolumeUSD(tokenID: string): Promise<string> {
        return this.computeTokenPrevious24hVolumeUSD(tokenID);
    }

    async computeTokenPrevious24hVolumeUSD(tokenID: string): Promise<string> {
        const valuesLast2Days = await this.tokenLast2DaysVolumeUSD(tokenID);
        return valuesLast2Days.previous;
    }

    async getAllTokensPrevious24hVolumeUSD(
        tokenIDs: string[],
    ): Promise<string[]> {
        return getAllKeys(
            this.cachingService,
            tokenIDs,
            'token.tokenPrevious24hVolumeUSD',
            this.tokenPrevious24hVolumeUSD.bind(this),
            CacheTtlInfo.Token,
        );
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'token',
        remoteTtl: CacheTtlInfo.TokenAnalytics.remoteTtl,
        localTtl: CacheTtlInfo.TokenAnalytics.localTtl,
    })
    async tokenLast2DaysVolumeUSD(
        tokenID: string,
    ): Promise<{ previous: string; current: string }> {
        return this.computeTokenLast2DaysVolumeUSD(tokenID);
    }

    async computeTokenLast2DaysVolumeUSD(
        tokenID: string,
    ): Promise<{ previous: string; current: string }> {
        const values48h = await this.analyticsQuery.getHourlySumValues({
            series: tokenID,
            metric: 'volumeUSD',
            time: '2 days',
        });

        if (!values48h || !Array.isArray(values48h)) {
            return {
                previous: '0',
                current: '0',
            };
        }

        const splitTime = moment().utc().subtract(1, 'day').startOf('hour');

        const previousDayValues = values48h.filter((item) =>
            moment.utc(item.timestamp).isSameOrBefore(splitTime),
        );

        const currentDayValues = values48h.filter((item) =>
            moment.utc(item.timestamp).isAfter(splitTime),
        );

        return {
            previous: previousDayValues
                .reduce(
                    (acc, item) => acc.plus(new BigNumber(item.value)),
                    new BigNumber(0),
                )
                .toFixed(),
            current: currentDayValues
                .reduce(
                    (acc, item) => acc.plus(new BigNumber(item.value)),
                    new BigNumber(0),
                )
                .toFixed(),
        };
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'token',
        remoteTtl: CacheTtlInfo.TokenAnalytics.remoteTtl,
        localTtl: CacheTtlInfo.TokenAnalytics.localTtl,
    })
    async tokenLiquidityUSD(tokenID: string): Promise<string> {
        return this.computeTokenLiquidityUSD(tokenID);
    }

    async computeTokenLiquidityUSD(tokenID: string): Promise<string> {
        const [pairs, commonTokenIDs] = await Promise.all([
            this.routerAbi.pairsMetadata(),
            this.routerAbi.commonTokensForUserPairs(),
        ]);

        const relevantPairs = pairs.filter(
            (pair) =>
                tokenID === pair.firstTokenID || pair.secondTokenID === tokenID,
        );

        const [
            allFirstTokensLockedValueUSD,
            allSecondTokensLockedValueUSD,
            allPairsState,
        ] = await Promise.all([
            this.pairCompute.getAllFirstTokensLockedValueUSD(
                relevantPairs.map((pair) => pair.address),
            ),
            this.pairCompute.getAllSecondTokensLockedValueUSD(
                relevantPairs.map((pair) => pair.address),
            ),
            this.pairService.getAllStates(
                relevantPairs.map((pair) => pair.address),
            ),
        ]);

        let newLockedValue = new BigNumber(0);
        for (const [index, pair] of relevantPairs.entries()) {
            const firstTokenLockedValueUSD =
                allFirstTokensLockedValueUSD[index];
            const secondTokenLockedValueUSD =
                allSecondTokensLockedValueUSD[index];
            const state = allPairsState[index];

            if (
                state === 'Active' ||
                (commonTokenIDs.includes(pair.firstTokenID) &&
                    commonTokenIDs.includes(pair.secondTokenID))
            ) {
                const tokenLockedValueUSD =
                    tokenID === pair.firstTokenID
                        ? firstTokenLockedValueUSD
                        : secondTokenLockedValueUSD;
                newLockedValue = newLockedValue.plus(tokenLockedValueUSD);
                continue;
            }

            if (
                !commonTokenIDs.includes(pair.firstTokenID) &&
                !commonTokenIDs.includes(pair.secondTokenID)
            ) {
                continue;
            }

            const commonTokenLockedValueUSD = commonTokenIDs.includes(
                pair.firstTokenID,
            )
                ? new BigNumber(firstTokenLockedValueUSD)
                : new BigNumber(secondTokenLockedValueUSD);

            newLockedValue = newLockedValue.plus(commonTokenLockedValueUSD);
        }

        return newLockedValue.toFixed();
    }

    async getAllTokensLiquidityUSD(tokenIDs: string[]): Promise<string[]> {
        return getAllKeys<string>(
            this.cachingService,
            tokenIDs,
            'token.tokenLiquidityUSD',
            this.tokenLiquidityUSD.bind(this),
            CacheTtlInfo.TokenAnalytics,
        );
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'token',
        remoteTtl: CacheTtlInfo.Token.remoteTtl,
        localTtl: CacheTtlInfo.Token.localTtl,
    })
    async tokenCreatedAt(tokenID: string): Promise<string> {
        return this.computeTokenCreatedAtTimestamp(tokenID);
    }

    async computeTokenCreatedAtTimestamp(tokenID: string): Promise<string> {
        const elasticQueryAdapter: ElasticQuery = new ElasticQuery();
        elasticQueryAdapter.condition.must = [QueryType.Match('_id', tokenID)];

        const tokens = await this.elasticService.getList(
            'tokens',
            '',
            elasticQueryAdapter,
        );

        if (tokens.length > 0) {
            const createdAtTimestamp = tokens[0].timestamp;
            return createdAtTimestamp.toString();
        }

        return undefined;
    }

    async getAllTokensCreatedAt(tokenIDs: string[]): Promise<string[]> {
        return getAllKeys(
            this.cachingService,
            tokenIDs,
            'token.tokenCreatedAt',
            this.tokenCreatedAt.bind(this),
            CacheTtlInfo.Token,
        );
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    async tokenSwapCount(tokenID: string): Promise<number> {
        const allSwapsCount = await this.swapCountExecutor.execute(null);

        const currentTokenSwapCount = allSwapsCount.find(
            (elem) => elem.tokenID === tokenID,
        );

        return currentTokenSwapCount ? currentTokenSwapCount.swapsCount : 0;
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    async tokenPrevious24hSwapCount(tokenID: string): Promise<number> {
        const allSwapsCount = await this.swapCountPrevious24hExecutor.execute(
            null,
        );

        const currentTokenSwapCount = allSwapsCount.find(
            (elem) => elem.tokenID === tokenID,
        );

        return currentTokenSwapCount ? currentTokenSwapCount.swapsCount : 0;
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    async allTokensSwapsCount(): Promise<
        { tokenID: string; swapsCount: number }[]
    > {
        const cacheKey = 'token.allTokensSwapsCount';
        const cachedValue = await this.cachingService.get<
            { tokenID: string; swapsCount: number }[]
        >(cacheKey);
        if (cachedValue && cachedValue !== undefined) {
            return cachedValue;
        }

        const end = moment.utc().unix();
        const start = moment.unix(end).subtract(1, 'day').unix();

        const swapsCount = await this.computeAllTokensSwapsCount(start, end);
        await this.cachingService.set(
            cacheKey,
            swapsCount,
            CacheTtlInfo.Token.remoteTtl,
            CacheTtlInfo.Token.localTtl,
        );
        return swapsCount;
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    async allTokensSwapsCountPrevious24h(): Promise<
        { tokenID: string; swapsCount: number }[]
    > {
        const cacheKey = 'token.allTokensSwapsCountPrevious24h';
        const cachedValue = await this.cachingService.get<
            { tokenID: string; swapsCount: number }[]
        >(cacheKey);
        if (cachedValue && cachedValue !== undefined) {
            return cachedValue;
        }

        const end = moment.utc().subtract(1, 'day').unix();
        const start = moment.utc().subtract(2, 'days').unix();

        const swapsCount = await this.computeAllTokensSwapsCount(start, end);
        await this.cachingService.set(
            cacheKey,
            swapsCount,
            CacheTtlInfo.Token.remoteTtl,
            CacheTtlInfo.Token.localTtl,
        );
        return swapsCount;
    }

    async computeAllTokensSwapsCount(
        start: number,
        end: number,
    ): Promise<{ tokenID: string; swapsCount: number }[]> {
        const pairAddresses = await this.routerAbi.pairsAddress();

        const allSwapsCount =
            await this.elasticEventsService.getTokenSwapsCount(
                start,
                end,
                pairAddresses,
            );

        const result = [];

        for (const entry of allSwapsCount.entries()) {
            result.push({
                tokenID: entry[0],
                swapsCount: entry[1],
            });
        }

        return result;
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'token',
        remoteTtl: CacheTtlInfo.Token.remoteTtl,
        localTtl: CacheTtlInfo.Token.localTtl,
    })
    async tokenTrendingScore(tokenID: string): Promise<string> {
        return this.computeTokenTrendingScore(tokenID);
    }

    async computeTokenTrendingScore(tokenID: string): Promise<string> {
        const [volumeChange, priceChange, tradeChange] = await Promise.all([
            this.tokenVolumeUSDChange24h(tokenID),
            this.tokenPriceChange24h(tokenID),
            this.tokenTradeChange24h(tokenID),
        ]);

        const minScore = -(10 ** 9);

        const volumeScore = new BigNumber(
            constantsConfig.trendingScore.VOLUME_WEIGHT,
        ).multipliedBy(volumeChange > 0 ? Math.log(volumeChange) : minScore);
        const priceScore = new BigNumber(
            constantsConfig.trendingScore.PRICE_WEIGHT,
        ).multipliedBy(priceChange > 0 ? Math.log(priceChange) : minScore);
        const tradeScore = new BigNumber(
            constantsConfig.trendingScore.TRADES_COUNT_WEIGHT,
        ).multipliedBy(tradeChange > 0 ? Math.log(tradeChange) : minScore);

        const trendingScore = volumeScore.plus(priceScore).plus(tradeScore);

        return trendingScore.toFixed();
    }

    async getAllTokensTrendingScore(tokenIDs: string[]): Promise<string[]> {
        return getAllKeys(
            this.cachingService,
            tokenIDs,
            'token.tokenTrendingScore',
            this.tokenTrendingScore.bind(this),
            CacheTtlInfo.Token,
        );
    }
}
