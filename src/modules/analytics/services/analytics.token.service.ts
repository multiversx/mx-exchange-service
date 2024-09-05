import { ErrorLoggerAsync } from '@multiversx/sdk-nestjs-common';
import { Injectable } from '@nestjs/common';
import moment from 'moment';
import { AnalyticsQueryService } from 'src/services/analytics/services/analytics.query.service';
import { OhlcvDataModel, TokenCandlesModel } from '../models/analytics.model';
import { isValidUnixTimestamp } from 'src/helpers/helpers';

@Injectable()
export class AnalyticsTokenService {
    constructor(private readonly analyticsQuery: AnalyticsQueryService) {}

    @ErrorLoggerAsync()
    async computeTokensLast7dPrice(
        identifiers: string[],
        hoursResolution = 4,
    ): Promise<TokenCandlesModel[]> {
        const endDate = moment().unix();
        const startDate = moment().subtract(7, 'days').startOf('hour').unix();

        const tokenCandles = await this.analyticsQuery.getCandlesForTokens({
            identifiers,
            start: startDate,
            end: endDate,
            resolution: `${hoursResolution} hours`,
        });

        const tokensNeedingGapfilling = this.identifyTokensNeedingGapfilling(
            identifiers,
            tokenCandles,
        );

        if (tokensNeedingGapfilling.length === 0) {
            return tokenCandles.map((tokenData) => this.formatData(tokenData));
        }

        return this.handleGapFilling(
            tokenCandles,
            tokensNeedingGapfilling,
            startDate,
            endDate,
            hoursResolution,
        );
    }

    private identifyTokensNeedingGapfilling(
        identifiers: string[],
        tokenCandles: TokenCandlesModel[],
    ): string[] {
        return identifiers.filter((tokenID) => {
            const tokenData = tokenCandles.find(
                (elem) => elem.identifier === tokenID,
            );
            return (
                !tokenData ||
                tokenData.candles.some((candle) => candle.ohlcv.includes(-1))
            );
        });
    }

    private async handleGapFilling(
        tokenCandles: TokenCandlesModel[],
        tokensNeedingGapfilling: string[],
        startDate: number,
        endDate: number,
        hoursResolution: number,
    ): Promise<TokenCandlesModel[]> {
        const earliestStartDate =
            await this.analyticsQuery.getEarliestStartDate(
                tokensNeedingGapfilling,
            );

        if (!earliestStartDate) {
            return this.gapfillTokensWithEmptyData(
                tokenCandles,
                tokensNeedingGapfilling,
                startDate,
                endDate,
                hoursResolution,
            );
        }

        const lastCandles = await this.analyticsQuery.getLastCandleForTokens({
            identifiers: tokensNeedingGapfilling,
            start: moment(earliestStartDate).utc().unix(),
            end: startDate,
        });

        return this.gapfillTokens(
            tokenCandles,
            tokensNeedingGapfilling,
            lastCandles,
            startDate,
            endDate,
            hoursResolution,
        );
    }

    private gapfillTokensWithEmptyData(
        tokenCandles: TokenCandlesModel[],
        tokensNeedingGapfilling: string[],
        startTimestamp: number,
        endTimestamp: number,
        hoursResolution: number,
    ): TokenCandlesModel[] {
        tokensNeedingGapfilling.forEach((tokenID) => {
            const emptyTokenData = this.gapfillTokenCandles(
                new TokenCandlesModel({ identifier: tokenID, candles: [] }),
                startTimestamp,
                endTimestamp,
                hoursResolution,
                [0, 0, 0, 0, 0],
            );
            tokenCandles.push(emptyTokenData);
        });
        return tokenCandles.map((tokenData) => this.formatData(tokenData));
    }

    private gapfillTokens(
        tokenCandles: TokenCandlesModel[],
        tokensNeedingGapfilling: string[],
        lastCandles: TokenCandlesModel[],
        startTimestamp: number,
        endTimestamp: number,
        hoursResolution: number,
    ): TokenCandlesModel[] {
        const result = tokenCandles.filter(
            (tokenData) =>
                !tokensNeedingGapfilling.includes(tokenData.identifier),
        );

        const gapfilledTokens = tokensNeedingGapfilling.map((tokenID) => {
            let tokenData = tokenCandles.find(
                (elem) => elem.identifier === tokenID,
            );
            const lastCandle = lastCandles.find(
                (elem) => elem.identifier === tokenID,
            );

            let gapfillOhlc = [0, 0, 0, 0, 0];
            if (lastCandle) {
                // remove volume (last value in array) - not suitable for gapfilling
                const adjustedCandle = lastCandle.candles[0].ohlcv;
                adjustedCandle.pop();
                adjustedCandle.push(0);

                gapfillOhlc = adjustedCandle;
            }

            if (!tokenData) {
                tokenData = new TokenCandlesModel({
                    identifier: tokenID,
                    candles: [],
                });
            }

            return this.gapfillTokenCandles(
                tokenData,
                startTimestamp,
                endTimestamp,
                hoursResolution,
                gapfillOhlc,
            );
        });

        return [...gapfilledTokens, ...result].map((tokenData) =>
            this.formatData(tokenData),
        );
    }

    private gapfillTokenCandles(
        tokenData: TokenCandlesModel,
        startTimestamp: number,
        endTimestamp: number,
        hoursResolution: number,
        gapfillOhlc: number[],
    ): TokenCandlesModel {
        if (tokenData.candles.length === 0) {
            const timestamps = this.generateTimestampsForHoursInterval(
                startTimestamp,
                endTimestamp,
                hoursResolution,
            );

            timestamps.forEach((timestamp) => {
                tokenData.candles.push(
                    new OhlcvDataModel({
                        time: timestamp,
                        ohlcv: [...gapfillOhlc],
                    }),
                );
            });

            return tokenData;
        }

        tokenData.candles.forEach((candle) => {
            if (candle.ohlcv.includes(-1)) {
                candle.ohlcv = [...gapfillOhlc];
            }
        });

        return tokenData;
    }

    private generateTimestampsForHoursInterval(
        startTimestamp: number,
        endTimestamp: number,
        intervalHours: number,
    ): string[] {
        const timestamps: string[] = [];

        let start = moment.unix(startTimestamp);
        const end = moment.unix(endTimestamp);

        // Align the start time with the next 4-hour boundary
        const remainder = start.hour() % intervalHours;
        if (remainder !== 0) {
            start = start.add(intervalHours - remainder, 'hours');
        }

        start = start.startOf('hour');

        // Generate timestamps at the specified interval until we reach the end time
        while (start.isSameOrBefore(end)) {
            timestamps.push(start.unix().toString());
            start = start.add(intervalHours, 'hours');
        }

        return timestamps;
    }

    private formatData(tokenData: TokenCandlesModel): TokenCandlesModel {
        tokenData.candles.forEach((candle) => {
            const candleTime = isValidUnixTimestamp(candle.time)
                ? candle.time
                : moment(candle.time).unix().toString();

            candle.time = candleTime;
        });
        return tokenData;
    }
}
