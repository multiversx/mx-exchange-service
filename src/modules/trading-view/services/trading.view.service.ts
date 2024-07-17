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
import { TokenService } from 'src/modules/tokens/services/token.service';
import { RouterAbiService } from 'src/modules/router/services/router.abi.service';
import { EsdtToken } from 'src/modules/tokens/models/esdtToken.model';
import { PairMetadata } from 'src/modules/router/models/pair.metadata.model';
import { OhlcvDataModel } from 'src/modules/analytics/models/analytics.model';
import { decodeTime } from 'src/utils/analytics.utils';

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
        const start = queryArgs.from;

        const priceCandles = await this.analyticsQueryService.getCandles({
            series: series,
            metric: metric,
            start: start,
            end: queryArgs.to,
            resolution: resolution,
            countback: queryArgs.countback,
        });

        if (priceCandles.length === 0) {
            return new BarsResponse({
                s: 'no_data',
                nextTime: start - 1,
            });
        }

        const result = new BarsResponse({
            s: 'ok',
            t: [],
            o: [],
            h: [],
            l: [],
            c: [],
            v: [],
        });

        for (const candle of priceCandles) {
            result.t.push(moment(candle.time).unix());
            result.o.push(new BigNumber(candle.ohlcv[0]).toNumber());
            result.h.push(new BigNumber(candle.ohlcv[1]).toNumber());
            result.l.push(new BigNumber(candle.ohlcv[2]).toNumber());
            result.c.push(new BigNumber(candle.ohlcv[3]).toNumber());
            result.v.push(new BigNumber(candle.ohlcv[4]).toNumber());
        }

        return result;
    }

    private async fillMissingCandles(
        series: string,
        metric: string,
        end: number,
        resolution: PriceCandlesResolutions,
        countback: number,
        candles: OhlcvDataModel[],
    ): Promise<OhlcvDataModel[]> {
        const decodedResolution = decodeTime(resolution);
        const resolutionInMinutes = moment
            .duration(decodedResolution[0], decodedResolution[1])
            .asMinutes();

        const expectedTimestamps = [];

        const roundedEndDown = this.getRoundedMoment(end, resolution);
        expectedTimestamps.push(roundedEndDown.unix());

        for (let index = 0; index < countback - 1; index++) {
            const expectedTime = roundedEndDown.subtract(
                resolutionInMinutes,
                'minutes',
            );
            expectedTimestamps.push(expectedTime.unix());
        }

        expectedTimestamps.reverse();

        const result = [];
        console.log('initial candles', candles.length);
        if (moment(candles[0].time).unix() !== expectedTimestamps[0]) {
            const previousCandle =
                await this.analyticsQueryService.getPreviousCandle({
                    series,
                    metric,
                    start: expectedTimestamps[0],
                    resolution,
                });

            console.log('prev candle call : ', previousCandle);
            result.push(
                new OhlcvDataModel({
                    time: moment.unix(expectedTimestamps[0]).utc().toString(),
                    ohlcv: [
                        previousCandle.ohlcv[0],
                        previousCandle.ohlcv[0],
                        previousCandle.ohlcv[0],
                        previousCandle.ohlcv[0],
                        0,
                    ],
                }),
            );
        }

        console.log('Start candle filling');
        for (const [index, expectedTimestamp] of expectedTimestamps.entries()) {
            const candleIndex = candles.findIndex(
                (elem) => moment(elem.time).unix() === expectedTimestamp,
            );

            if (candleIndex === -1) {
                console.log('missing timestamp : ', expectedTimestamp);

                const previousCandle =
                    index === 0 ? result[index] : result[index - 1];
                console.log(
                    `prev candle for index ${index - 1}`,
                    previousCandle,
                );
                result.push(
                    new OhlcvDataModel({
                        time: moment.unix(expectedTimestamp).utc().toString(),
                        ohlcv: [
                            previousCandle.ohlcv[0],
                            previousCandle.ohlcv[0],
                            previousCandle.ohlcv[0],
                            previousCandle.ohlcv[0],
                            0,
                        ],
                    }),
                );
            } else {
                result.push(candles[candleIndex]);
            }
        }

        // console.log('provided : ' + end + ' (' + endDate.toString() + ')');
        // console.log('rounded DOWN: ' + roundedEndDown.toString());

        // console.log(expectedTimestamps);

        return result;
    }

    private getRoundedMoment(
        timestamp: number,
        resolution: PriceCandlesResolutions,
    ): moment.Moment {
        const date = moment.unix(timestamp);

        switch (resolution) {
            case PriceCandlesResolutions.MINUTE_1:
                return date.startOf('minute');
            case PriceCandlesResolutions.MINUTE_5:
                return date
                    .startOf('minute')
                    .minute(Math.floor(date.minute() / 5) * 5);
            case PriceCandlesResolutions.MINUTE_15:
                return date
                    .startOf('minute')
                    .minute(Math.floor(date.minute() / 15) * 15);
            case PriceCandlesResolutions.MINUTE_30:
                return date
                    .startOf('minute')
                    .minute(Math.floor(date.minute() / 30) * 30);
            case PriceCandlesResolutions.HOUR_1:
                return date.startOf('hour');
            case PriceCandlesResolutions.HOUR_4:
                return date
                    .startOf('hour')
                    .hour(Math.floor(date.hour() / 4) * 4);
            case PriceCandlesResolutions.DAY_1:
                return date.startOf('day');
            case PriceCandlesResolutions.DAY_7:
                return date.startOf('isoWeek');
            case PriceCandlesResolutions.MONTH_1:
                return date.startOf('month');
            default:
                throw new Error('Unsupported resolution');
            // case PriceCandlesResolutions.MINUTE_1:
            //     return rounding === 'down'
            //         ? date.startOf('minute')
            //         : date.startOf('minute').add(1, 'minute');
            // case PriceCandlesResolutions.MINUTE_5:
            //     if (rounding === 'down') {
            //         return date
            //             .minute(Math.floor(date.minute() / 5) * 5)
            //             .second(0);
            //     } else {
            //         const roundedUp = date
            //             .clone()
            //             .minute(Math.ceil(date.minute() / 5) * 5)
            //             .second(0);
            //         return roundedUp.isAfter(date)
            //             ? roundedUp
            //             : roundedUp.add(5, 'minutes');
            //     }
            // case PriceCandlesResolutions.MINUTE_15:
            //     if (rounding === 'down') {
            //         return date
            //             .minute(Math.floor(date.minute() / 15) * 15)
            //             .second(0);
            //     } else {
            //         const roundedUp = date
            //             .clone()
            //             .minute(Math.ceil(date.minute() / 15) * 15)
            //             .second(0);
            //         return roundedUp.isAfter(date)
            //             ? roundedUp
            //             : roundedUp.add(15, 'minutes');
            //     }
            // case PriceCandlesResolutions.MINUTE_30:
            //     if (rounding === 'down') {
            //         return date
            //             .minute(Math.floor(date.minute() / 30) * 30)
            //             .second(0);
            //     } else {
            //         const roundedUp = date
            //             .clone()
            //             .minute(Math.ceil(date.minute() / 30) * 30)
            //             .second(0);
            //         return roundedUp.isAfter(date)
            //             ? roundedUp
            //             : roundedUp.add(30, 'minutes');
            //     }
            // case PriceCandlesResolutions.HOUR_1:
            //     return rounding === 'down'
            //         ? date.startOf('hour')
            //         : date.startOf('hour').add(1, 'hour');
            // case PriceCandlesResolutions.HOUR_4:
            //     if (rounding === 'down') {
            //         return date
            //             .hour(Math.floor(date.hour() / 4) * 4)
            //             .minute(0)
            //             .second(0);
            //     } else {
            //         const roundedUp = date
            //             .clone()
            //             .hour(Math.ceil(date.hour() / 4) * 4)
            //             .minute(0)
            //             .second(0);
            //         return roundedUp.isAfter(date)
            //             ? roundedUp
            //             : roundedUp.add(4, 'hours');
            //     }
            // case PriceCandlesResolutions.DAY_1:
            //     return rounding === 'down'
            //         ? date.startOf('day')
            //         : date.startOf('day').add(1, 'day');
            // case PriceCandlesResolutions.DAY_7:
            //     if (rounding === 'down') {
            //         return date
            //             .startOf('day')
            //             .day(date.day() - (date.day() % 7));
            //     } else {
            //         const roundedUp = date
            //             .clone()
            //             .startOf('day')
            //             .day(date.day() + (7 - (date.day() % 7)));
            //         return roundedUp.isAfter(date)
            //             ? roundedUp
            //             : roundedUp.add(7, 'days');
            //     }
            // case PriceCandlesResolutions.MONTH_1:
            //     return rounding === 'down'
            //         ? date.startOf('month')
            //         : date.startOf('month').add(1, 'month');
            // default:
            //     throw new Error('Unsupported resolution');
        }
    }

    private convertResolution(
        inputResolution: TradingViewResolution,
    ): PriceCandlesResolutions {
        return resolutionMapping[inputResolution];
    }
}
