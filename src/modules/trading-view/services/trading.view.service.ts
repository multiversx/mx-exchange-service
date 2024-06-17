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
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import { PairMetadata } from 'src/modules/router/models/pair.metadata.model';

@Injectable()
export class TradingViewService {
    constructor(
        private readonly analyticsQueryService: AnalyticsQueryService,
        private readonly tokenService: TokenService,
        private readonly routerAbi: RouterAbiService,
    ) {}

    async resolveSymbol(
        symbol: string,
    ): Promise<{ ticker: string; name: string }> {
        if (symbol.includes(':')) {
            return await this.resolvePairSymbol(symbol);
        }

        const token = await this.getTokenFromSymbol(symbol);

        if (!token) {
            throw new NotFoundException(`Could not resolve symbol ${symbol}`);
        }

        return { ticker: symbol, name: token.name };
    }

    async resolvePairSymbol(
        symbol: string,
    ): Promise<{ ticker: string; name: string }> {
        const resolvedPair = await this.getPairMetadataFromSymbol(symbol);

        if (!resolvedPair) {
            throw new NotFoundException(`Could not resolve symbol ${symbol}`);
        }

        const baseTokenID = symbol.split(':')[0];

        const [firstToken, secondToken] = await Promise.all([
            this.tokenService.getTokenMetadata(resolvedPair.firstTokenID),
            this.tokenService.getTokenMetadata(resolvedPair.secondTokenID),
        ]);

        return {
            ticker: symbol,
            name:
                resolvedPair.firstTokenID === baseTokenID
                    ? `${firstToken.name} : ${secondToken.name}`
                    : `${secondToken.name} : ${firstToken.name}`,
        };
    }

    private async getTokenFromSymbol(symbol: string): Promise<EsdtToken> {
        const allTokenIDs = await this.tokenService.getUniqueTokenIDs(false);

        if (!allTokenIDs.includes(symbol)) {
            return undefined;
        }

        return await this.tokenService.getTokenMetadata(symbol);
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
        }

        const resolution = this.convertResolution(queryArgs.resolution);

        let start = queryArgs.from;

        // if 'countback' is set, 'from' should be ignored
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
                series: series,
                metric: metric,
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

    private convertResolution(
        inputResolution: TradingViewResolution,
    ): PriceCandlesResolutions {
        return resolutionMapping[inputResolution];
    }
}
