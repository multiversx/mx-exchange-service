import { Injectable, NotFoundException } from '@nestjs/common';
import {
    BarsQueryArgs,
    BarsResponse,
    TradingViewResolution,
    resolutionMapping,
} from '../dtos/bars.response';
import { AnalyticsQueryService } from 'src/services/analytics/services/analytics.query.service';
import { PriceCandlesResolutions } from 'src/modules/analytics/models/query.args';
import moment from 'moment';
import BigNumber from 'bignumber.js';
import { decodeTime } from 'src/utils/analytics.utils';
import { TokenService } from 'src/modules/tokens/services/token.service';
import { RouterAbiService } from 'src/modules/router/services/router.abi.service';
import { ErrorLoggerAsync } from '@multiversx/sdk-nestjs-common';
import { GetOrSetCache } from 'src/helpers/decorators/caching.decorator';
import { CacheTtlInfo } from 'src/services/caching/cache.ttl.info';

@Injectable()
export class TradingViewService {
    constructor(
        private readonly analyticsQueryService: AnalyticsQueryService,
        private readonly tokenService: TokenService,
        private readonly routerAbi: RouterAbiService,
    ) {}

    async resolveSymbol(symbol: string): Promise<string> {
        const allSymbols = await this.getSymbolsDetails();

        const currentSymbolDetails = allSymbols.find((elem) => {
            if (symbol.startsWith('erd1')) {
                const [symbolSeries, symbolMetric] = symbol.split(':');

                return (
                    elem.series === symbolSeries && elem.metric === symbolMetric
                );
            }
            return elem.series === symbol;
        });

        if (!currentSymbolDetails) {
            throw new NotFoundException(`Could not resolve symbol ${symbol}`);
        }

        return currentSymbolDetails.symbol;
    }

    async getBars(queryArgs: BarsQueryArgs): Promise<BarsResponse> {
        const allSymbols = await this.getSymbolsDetails();

        const currentSymbolDetails = allSymbols.find(
            (elem) => elem.symbol === queryArgs.symbol,
        );

        if (!currentSymbolDetails) {
            return new BarsResponse({
                s: 'error',
                errmsg: `Could not resolve symbol ${queryArgs.symbol}`,
            });
        }

        const resolution = this.convertResolution(queryArgs.resolution);

        let start = queryArgs.from;

        if (queryArgs.countback) {
            const decodedResolution = decodeTime(resolution);
            const resolutionInMinutes = moment
                .duration(decodedResolution[0], decodedResolution[1])
                .asMinutes();

            const countbackDuration = queryArgs.countback * resolutionInMinutes;
            start = moment
                .unix(queryArgs.to)
                .subtract(countbackDuration, 'minutes')
                .unix();
        }

        const priceCandles =
            await this.analyticsQueryService.getPriceCandlesWithoutGapfilling({
                series: currentSymbolDetails.series,
                metric: currentSymbolDetails.metric,
                start: start,
                end: queryArgs.to,
                resolution: resolution,
            });

        if (priceCandles.length === 0) {
            return new BarsResponse({
                s: 'no_data',
            });
        }

        const result = new BarsResponse({
            s: 'ok',
            t: [],
            o: [],
            h: [],
            l: [],
            c: [],
        });

        for (const candle of priceCandles) {
            result.t.push(moment(candle.time).unix());
            result.o.push(new BigNumber(candle.ohlc[0]).toNumber());
            result.h.push(new BigNumber(candle.ohlc[1]).toNumber());
            result.l.push(new BigNumber(candle.ohlc[2]).toNumber());
            result.c.push(new BigNumber(candle.ohlc[3]).toNumber());
        }

        return result;
    }

    private async getSeriesAndMetricFromSymbol(symbol: string) {
        const [base, quote] = symbol.split(':');

        if (quote === 'USD') {
            const tokens = await this.tokenService.getUniqueTokenIDs(false);
            const currentTokenID = tokens.find((token) =>
                token.startsWith(base),
            );

            if (!currentTokenID) {
                throw new NotFoundException(
                    `Could not resolve symbol ${symbol}`,
                );
            }

            return {
                series: currentTokenID,
                metric: 'priceUSD',
            };
        }
    }

    @ErrorLoggerAsync({
        logArgs: true,
    })
    @GetOrSetCache({
        baseKey: 'tradingview',
        remoteTtl: CacheTtlInfo.Analytics.remoteTtl,
        localTtl: CacheTtlInfo.Analytics.localTtl,
    })
    private async getSymbolsDetails(): Promise<
        { symbol: string; series: string; metric: string }[]
    > {
        const symbolsMap = await this.getSymbolsMap();

        const result = [];
        for (const entry of symbolsMap.entries()) {
            const [series, metric] = entry[1].split(':');
            result.push({
                symbol: entry[0],
                series,
                metric,
            });
        }

        return result;
    }

    private async getSymbolsMap(): Promise<Map<string, string>> {
        const symbolsMap: Map<string, string> = new Map();
        const [tokensIDs, pairsMetadata] = await Promise.all([
            this.tokenService.getUniqueTokenIDs(false),
            this.routerAbi.pairsMetadata(),
        ]);

        for (const tokenID of tokensIDs) {
            const ticker = tokenID.split('-')[0];
            const completeTickerBase = `${ticker}:USD`;
            const seriesAndMetric = `${tokenID}:priceUSD`;

            let completeTicker = completeTickerBase;
            let uniqueCounter = 0;

            while (symbolsMap.has(completeTicker)) {
                uniqueCounter++;
                completeTicker = `${ticker}${uniqueCounter}:USD`;
            }

            symbolsMap.set(completeTicker, seriesAndMetric);
        }

        for (const pair of pairsMetadata) {
            const firstTokenTicker = pair.firstTokenID.split('-')[0];
            const secondTokenTicker = pair.secondTokenID.split('-')[0];

            const baseQuoteKey = `${firstTokenTicker}:${secondTokenTicker}`;
            const baseQuoteSeriesAndMetric = `${pair.address}:firstTokenPrice`;

            const quoteBaseKey = `${secondTokenTicker}:${firstTokenTicker}`;
            const quoteBaseSeriesAndMetric = `${pair.address}:secondTokenPrice`;

            symbolsMap.set(baseQuoteKey, baseQuoteSeriesAndMetric);
            symbolsMap.set(quoteBaseKey, quoteBaseSeriesAndMetric);
        }

        return symbolsMap;
    }

    private convertResolution(
        inputResolution: TradingViewResolution,
    ): PriceCandlesResolutions {
        return resolutionMapping[inputResolution];
    }
}
