import { Injectable, NotFoundException } from '@nestjs/common';
import {
    BarsQueryArgs,
    BarsResponse,
    TradingViewResolution,
    TradingViewSymbol,
    resolutionMapping,
} from '../dtos/bars.response';
import { AnalyticsQueryService } from 'src/services/analytics/services/analytics.query.service';
import { PriceCandlesResolutions } from 'src/modules/analytics/models/query.args';
import moment from 'moment';
import BigNumber from 'bignumber.js';
import { TokenService } from 'src/modules/tokens/services/token.service';
import { RouterAbiService } from 'src/modules/router/services/router.abi.service';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import { PairMetadata } from 'src/modules/router/models/pair.metadata.model';
import { PairComputeService } from 'src/modules/pair/services/pair.compute.service';
import { OhlcvDataModel } from 'src/modules/analytics/models/analytics.model';
import { denominateAmount } from 'src/utils/token.converters';

@Injectable()
export class TradingViewService {
    constructor(
        private readonly analyticsQueryService: AnalyticsQueryService,
        private readonly tokenService: TokenService,
        private readonly routerAbi: RouterAbiService,
        private readonly pairCompute: PairComputeService,
    ) {}

    async resolveSymbol(symbol: string): Promise<TradingViewSymbol> {
        if (symbol.includes(':')) {
            return await this.resolvePairSymbol(symbol);
        }

        const token = await this.getTokenFromSymbol(symbol);

        if (!token) {
            throw new NotFoundException(`Could not resolve symbol ${symbol}`);
        }

        return new TradingViewSymbol({
            ticker: symbol,
            name: token.name,
            pricescale: this.getPriceScaleForPrice(token.price),
        });
    }

    async resolvePairSymbol(symbol: string): Promise<TradingViewSymbol> {
        const resolvedPair = await this.getPairMetadataFromSymbol(symbol);

        if (!resolvedPair) {
            throw new NotFoundException(`Could not resolve symbol ${symbol}`);
        }

        const baseTokenID = symbol.split(':')[0];

        const [firstToken, secondToken] = await Promise.all([
            this.tokenService.tokenMetadata(resolvedPair.firstTokenID),
            this.tokenService.tokenMetadata(resolvedPair.secondTokenID),
        ]);

        const tokenPrice =
            resolvedPair.firstTokenID !== baseTokenID
                ? await this.pairCompute.secondTokenPrice(resolvedPair.address)
                : await this.pairCompute.firstTokenPrice(resolvedPair.address);

        return new TradingViewSymbol({
            ticker: symbol,
            name:
                resolvedPair.firstTokenID === baseTokenID
                    ? `${firstToken.name} : ${secondToken.name}`
                    : `${secondToken.name} : ${firstToken.name}`,
            pricescale: this.getPriceScaleForPrice(tokenPrice),
        });
    }

    private getPriceScaleForPrice(price: string): number {
        const priceBN = new BigNumber(price);

        if (priceBN.gt(new BigNumber(1))) {
            return 100000;
        }

        const absValue = priceBN.abs();

        let leadingZeros = 0;
        const digits = absValue.toFixed().split('.')[1] || '';
        for (const digit of digits) {
            if (digit === '0') {
                leadingZeros++;
            } else {
                break;
            }
        }

        const scale = 10 ** (leadingZeros + 5);

        return scale;
    }

    private async getTokenFromSymbol(symbol: string): Promise<EsdtToken> {
        const allTokenIDs = await this.tokenService.getUniqueTokenIDs(false);

        if (!allTokenIDs.includes(symbol)) {
            return undefined;
        }

        return await this.tokenService.tokenMetadata(symbol);
    }

    private async getPairMetadataFromSymbol(
        symbol: string,
    ): Promise<PairMetadata> {
        const pairsMetadata = await this.routerAbi.pairsMetadata();
        const [baseTokenID, quoteTokenID] = symbol.split(':');

        const resolvedPair = pairsMetadata.find((pair) => {
            return (
                (pair.firstTokenID === baseTokenID &&
                    pair.secondTokenID === quoteTokenID) ||
                (pair.secondTokenID === baseTokenID &&
                    pair.firstTokenID === quoteTokenID)
            );
        });

        return resolvedPair;
    }

    async getBars(queryArgs: BarsQueryArgs): Promise<BarsResponse> {
        let metric: string;
        let series: string;
        let tokenDecimals = 18;

        if (queryArgs.symbol.includes(':')) {
            const pair = await this.getPairMetadataFromSymbol(queryArgs.symbol);
            if (!pair) {
                return new BarsResponse({
                    s: 'error',
                    errmsg: `Could not resolve symbol ${queryArgs.symbol}`,
                });
            }
            const baseTokenID = queryArgs.symbol.split(':')[0];
            series = pair.address;
            metric =
                pair.firstTokenID === baseTokenID
                    ? 'firstTokenPrice'
                    : 'secondTokenPrice';
            const token =
                pair.firstTokenID === baseTokenID
                    ? await this.tokenService.tokenMetadata(pair.firstTokenID)
                    : await this.tokenService.tokenMetadata(pair.secondTokenID);
            tokenDecimals = token.decimals;
        } else {
            const token = await this.getTokenFromSymbol(queryArgs.symbol);
            if (!token) {
                return new BarsResponse({
                    s: 'error',
                    errmsg: `Could not resolve symbol ${queryArgs.symbol}`,
                });
            }
            series = token.identifier;
            metric = 'priceUSD';
            tokenDecimals = token.decimals;
        }

        const resolution = this.convertResolution(queryArgs.resolution);
        const start = queryArgs.from;

        const priceCandles = await this.analyticsQueryService.getCandles({
            series: series,
            metric: metric,
            start: start,
            end: queryArgs.to,
            resolution: resolution,
        });

        if (priceCandles.length === 0) {
            const seriesStartDate =
                await this.analyticsQueryService.getStartDate(series);

            const noDataResponse = new BarsResponse({
                s: 'no_data',
            });

            if (!seriesStartDate) {
                return noDataResponse;
            }

            const seriesStartUnix = moment(seriesStartDate).unix();

            if (start > seriesStartUnix) {
                noDataResponse.nextTime = start - 1;
            }

            return noDataResponse;
        }

        return this.formatCandlesResponse(metric, priceCandles, tokenDecimals);
    }

    private formatCandlesResponse(
        metric: string,
        candles: OhlcvDataModel[],
        tokenDecimals: number,
    ): BarsResponse {
        const result = new BarsResponse({
            s: 'ok',
            t: [],
            o: [],
            h: [],
            l: [],
            c: [],
            v: [],
        });

        for (const candle of candles) {
            const closeValue = new BigNumber(candle.ohlcv[3]);
            const volumeValue = new BigNumber(candle.ohlcv[4]);

            result.t.push(moment(candle.time).unix());
            result.o.push(new BigNumber(candle.ohlcv[0]).toNumber());
            result.h.push(new BigNumber(candle.ohlcv[1]).toNumber());
            result.l.push(new BigNumber(candle.ohlcv[2]).toNumber());
            result.c.push(closeValue.toNumber());

            if (metric === 'priceUSD') {
                result.v.push(volumeValue.toNumber());
            } else {
                const denominatedVolume = denominateAmount(
                    volumeValue.toFixed(),
                    tokenDecimals,
                );

                result.v.push(
                    denominatedVolume.multipliedBy(closeValue).toNumber(),
                );
            }
        }

        return result;
    }

    private convertResolution(
        inputResolution: TradingViewResolution,
    ): PriceCandlesResolutions {
        return resolutionMapping[inputResolution];
    }
}
