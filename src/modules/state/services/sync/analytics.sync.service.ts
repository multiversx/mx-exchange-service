import { forwardRef, Inject, Injectable } from '@nestjs/common';
import BigNumber from 'bignumber.js';
import { constantsConfig, tokenProviderUSD } from 'src/config';
import { HistoricDataModel } from 'src/modules/analytics/models/analytics.model';
import { PairModel } from 'src/modules/pair/models/pair.model';
import { PairComputeService } from 'src/modules/pair/services/pair.compute.service';
import {
    EsdtToken,
    EsdtTokenType,
} from 'src/modules/tokens/models/esdtToken.model';
import { TokenComputeService } from 'src/modules/tokens/services/token.compute.service';
import { AnalyticsQueryService } from 'src/services/analytics/services/analytics.query.service';
import { CacheService } from 'src/services/caching/cache.service';
import { generateCacheKeyFromParams } from 'src/utils/generate-cache-key';

const MIN_TRENDING_SCORE = -(10 ** 9);

@Injectable()
export class AnalyticsSyncService {
    constructor(
        @Inject(forwardRef(() => PairComputeService))
        private readonly pairCompute: PairComputeService,
        @Inject(forwardRef(() => TokenComputeService))
        private readonly tokenCompute: TokenComputeService,
        private readonly analyticsQuery: AnalyticsQueryService,
        private readonly cacheService: CacheService,
    ) {}

    async getPairAnalytics(pair: PairModel): Promise<Partial<PairModel>> {
        const [
            firstTokenVolume24h,
            secondTokenVolume24h,
            volumeUSD24h,
            previous24hVolumeUSD,
            feesUSD24h,
            previous24hFeesUSD,
            previous24hLockedValueUSD,
            tradesCount,
            tradesCount24h,
        ] = await Promise.all([
            this.pairCompute.firstTokenVolume(pair.address),
            this.pairCompute.secondTokenVolume(pair.address),
            this.pairCompute.volumeUSD(pair.address),
            this.pairCompute.previous24hVolumeUSD(pair.address),
            this.pairCompute.feesUSD(pair.address, '24h'),
            this.pairCompute.previous24hFeesUSD(pair.address),
            this.pairCompute.previous24hLockedValueUSD(pair.address),
            this.pairCompute.tradesCount(pair.address),
            this.pairCompute.tradesCount24h(pair.address),
        ]);

        const actualFees24hBig = new BigNumber(feesUSD24h).multipliedBy(
            new BigNumber(pair.totalFeePercent - pair.specialFeePercent).div(
                pair.totalFeePercent,
            ),
        );
        const feesAPR = actualFees24hBig.times(365).div(pair.lockedValueUSD);

        const pairUpdates: Partial<PairModel> = {
            firstTokenVolume24h,
            secondTokenVolume24h,
            volumeUSD24h,
            previous24hVolumeUSD,
            feesUSD24h,
            previous24hFeesUSD,
            previous24hLockedValueUSD,
            tradesCount,
            tradesCount24h,
            feesAPR: feesAPR.isNaN() ? '0' : feesAPR.toFixed(),
        };

        return pairUpdates;
    }

    async updateTokensAnalytics(
        tokens: Map<string, EsdtToken>,
        tokensNeedingAnalytics: string[],
    ): Promise<void> {
        const wegldToken = tokens.get(tokenProviderUSD);
        if (!wegldToken) {
            throw new Error(
                `Missing token provider in state. Cannot refresh analytics`,
            );
        }

        const [
            wrappedEGLDPrev24hPrice,
            allTokensSwapsCount,
            allTokensSwapsCountPrevious24h,
        ] = await Promise.all([
            this.computeTokenPrevious24hPrice(
                wegldToken,
                wegldToken.previous24hPrice,
            ),
            this.tokenCompute.allTokensSwapsCount(),
            this.tokenCompute.allTokensSwapsCountPrevious24h(),
        ]);

        const swapCountMap = new Map(
            allTokensSwapsCount.map(({ tokenID, swapsCount }) => [
                tokenID,
                swapsCount,
            ]),
        );

        const previous24hSwapCountMap = new Map(
            allTokensSwapsCountPrevious24h.map(({ tokenID, swapsCount }) => [
                tokenID,
                swapsCount,
            ]),
        );

        for (const tokenID of tokensNeedingAnalytics) {
            const token = tokens.get(tokenID);
            if (token.type === EsdtTokenType.FungibleLpToken) {
                continue;
            }

            const [volumeLast2Days, previous24hPrice, previous7dPrice] =
                await Promise.all([
                    this.tokenCompute.tokenLast2DaysVolumeUSD(token.identifier),
                    this.computeTokenPrevious24hPrice(
                        token,
                        wrappedEGLDPrev24hPrice,
                    ),
                    this.tokenCompute.tokenPrevious7dPrice(token.identifier),
                ]);

            token.volumeUSD24h = volumeLast2Days.current;
            token.previous24hVolume = volumeLast2Days.previous;
            token.previous24hPrice = previous24hPrice;
            token.previous7dPrice = previous7dPrice ?? '0';
            token.swapCount24h = swapCountMap.get(token.identifier) ?? 0;
            token.previous24hSwapCount =
                previous24hSwapCountMap.get(token.identifier) ?? 0;
            token.volumeUSDChange24h = this.computeTokenVolumeChange(token);
            token.priceChange24h = this.computeTokenPriceChange(token, '24h');
            token.priceChange7d = this.computeTokenPriceChange(token, '7d');
            token.tradeChange24h = this.computeTokenTradeChange24h(token);
            token.trendingScore = this.computeTokenTrendingScore(token);
        }
    }

    async updatePairsAnalytics(
        pairs: Map<string, PairModel>,
        pairsNeedingAnalytics: string[],
    ): Promise<void> {
        for (const address of pairsNeedingAnalytics) {
            const pair = pairs.get(address);
            const updates = await this.getPairAnalytics(pair);

            pairs.set(pair.address, {
                ...pair,
                ...updates,
            });
        }
    }

    private async computeTokenPrevious24hPrice(
        token: EsdtToken,
        wrappedEGLDPrev24hPrice: string,
    ): Promise<string> {
        const cachedValues24h = await this.cacheService.get<
            HistoricDataModel[]
        >(
            generateCacheKeyFromParams('analytics', [
                'values24h',
                token.identifier,
                'priceUSD',
            ]),
        );

        const values24h =
            !cachedValues24h || cachedValues24h === undefined
                ? await this.analyticsQuery.getValues24h({
                      series: token.identifier,
                      metric: 'priceUSD',
                  })
                : cachedValues24h;

        if (values24h.length > 0 && values24h[0]?.value === '0') {
            return new BigNumber(token.derivedEGLD)
                .times(wrappedEGLDPrev24hPrice)
                .toFixed();
        }

        return values24h[0]?.value ?? '0';
    }

    private computeTokenVolumeChange(token: EsdtToken): number {
        const currentVolumeBN = new BigNumber(token.volumeUSD24h);
        const previous24hVolumeBN = new BigNumber(token.previous24hVolume);

        if (currentVolumeBN.isZero()) {
            return 0;
        }

        const maxPrevious24hVolume = BigNumber.maximum(
            previous24hVolumeBN,
            constantsConfig.trendingScore.MIN_24H_VOLUME,
        );

        return currentVolumeBN.dividedBy(maxPrevious24hVolume).toNumber();
    }

    private computeTokenPriceChange(
        token: EsdtToken,
        period: '24h' | '7d',
    ): number {
        const currentPriceBN = new BigNumber(token.price);
        const previousPriceBN = new BigNumber(
            period === '24h' ? token.previous24hPrice : token.previous7dPrice,
        );

        if (previousPriceBN.isZero()) {
            return 0;
        }

        return currentPriceBN.dividedBy(previousPriceBN).toNumber();
    }

    private computeTokenTradeChange24h(token: EsdtToken): number {
        const currentSwapsBN = new BigNumber(token.swapCount24h);
        const previous24hSwapsBN = new BigNumber(token.previous24hSwapCount);

        const maxPrevious24hTradeCount = BigNumber.maximum(
            previous24hSwapsBN,
            constantsConfig.trendingScore.MIN_24H_TRADE_COUNT,
        );

        return currentSwapsBN.dividedBy(maxPrevious24hTradeCount).toNumber();
    }

    private computeTokenTrendingScore(token: EsdtToken): string {
        const { volumeUSDChange24h, priceChange24h, tradeChange24h } = token;

        const volumeScore = new BigNumber(
            constantsConfig.trendingScore.VOLUME_WEIGHT,
        ).multipliedBy(
            volumeUSDChange24h > 0
                ? Math.log(volumeUSDChange24h)
                : MIN_TRENDING_SCORE,
        );
        const priceScore = new BigNumber(
            constantsConfig.trendingScore.PRICE_WEIGHT,
        ).multipliedBy(
            priceChange24h > 0 ? Math.log(priceChange24h) : MIN_TRENDING_SCORE,
        );
        const tradeScore = new BigNumber(
            constantsConfig.trendingScore.TRADES_COUNT_WEIGHT,
        ).multipliedBy(
            tradeChange24h > 0 ? Math.log(tradeChange24h) : MIN_TRENDING_SCORE,
        );

        const trendingScore = volumeScore.plus(priceScore).plus(tradeScore);

        return trendingScore.toFixed();
    }
}
