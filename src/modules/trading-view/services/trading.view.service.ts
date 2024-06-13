import { Injectable } from '@nestjs/common';
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

@Injectable()
export class TradingViewService {
    constructor(
        private readonly analyticsQueryService: AnalyticsQueryService,
    ) {}

    async getBars(queryArgs: BarsQueryArgs): Promise<BarsResponse> {
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
                series: queryArgs.symbol,
                metric: 'priceUSD',
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
