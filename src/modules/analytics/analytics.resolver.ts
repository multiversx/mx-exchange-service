import { UsePipes, ValidationPipe } from '@nestjs/common';
import { Int, Query, Resolver, Args } from '@nestjs/graphql';
import {
    CandleDataModel,
    HistoricDataModel,
} from 'src/modules/analytics/models/analytics.model';
import {
    AnalyticsQueryArgs,
    PriceCandlesQueryArgs,
    TokenMiniChartPriceCandlesQueryArgs,
} from './models/query.args';
import { AnalyticsAWSGetterService } from './services/analytics.aws.getter.service';
import { AnalyticsComputeService } from './services/analytics.compute.service';
import { PairComputeService } from '../pair/services/pair.compute.service';
import { TokenService } from '../tokens/services/token.service';
import { AnalyticsPairService } from './services/analytics.pair.service';
import { PriceCandlesArgsValidationPipe } from './validators/price.candles.args.validator';
import { TradingActivityModel } from './models/trading.activity.model';
import { RouterAbiService } from '../router/services/router.abi.service';
import { alignTimestampTo4HourInterval } from 'src/utils/analytics.utils';
import { QueryArgsValidationPipe } from 'src/helpers/validators/query.args.validation.pipe';

@Resolver()
export class AnalyticsResolver {
    constructor(
        private readonly tokenService: TokenService,
        private readonly routerAbi: RouterAbiService,
        private readonly pairCompute: PairComputeService,
        private readonly analyticsCompute: AnalyticsComputeService,
        private readonly analyticsPairService: AnalyticsPairService,
        private readonly analyticsAWSGetter: AnalyticsAWSGetterService,
    ) {}

    @Query(() => String)
    async getTokenPriceUSD(@Args('tokenID') tokenID: string): Promise<string> {
        return this.pairCompute.tokenPriceUSD(tokenID);
    }

    @Query(() => String)
    async totalValueLockedUSD(): Promise<string> {
        return this.analyticsCompute.totalValueLockedUSD();
    }

    @Query(() => String)
    async totalValueStakedUSD(): Promise<string> {
        return this.analyticsCompute.totalValueStakedUSD();
    }

    @Query(() => String)
    async totalLockedValueUSDFarms(): Promise<string> {
        return this.analyticsCompute.lockedValueUSDFarms();
    }

    @Query(() => String)
    async totalLockedMexStakedUSD(): Promise<string> {
        return this.analyticsCompute.totalLockedMexStakedUSD();
    }

    @Query(() => String)
    async totalTokenSupply(@Args('tokenID') tokenID: string): Promise<string> {
        return (await this.tokenService.tokenMetadata(tokenID)).supply;
    }

    @Query(() => String)
    async totalAggregatedRewards(
        @Args('days', { type: () => Int }) days: number,
    ) {
        return this.analyticsCompute.totalAggregatedRewards(days);
    }

    @Query(() => String)
    async getFeeTokenBurned(
        @Args('tokenID') tokenID: string,
        @Args('time') time: string,
    ) {
        return this.analyticsCompute.feeTokenBurned(tokenID, time);
    }

    @Query(() => String)
    async getPenaltyTokenBurned(
        @Args('tokenID') tokenID: string,
        @Args('time') time: string,
    ) {
        return this.analyticsCompute.penaltyTokenBurned(tokenID, time);
    }

    @Query(() => [HistoricDataModel])
    @UsePipes(
        new ValidationPipe({
            skipNullProperties: true,
            skipMissingProperties: true,
            skipUndefinedProperties: true,
        }),
    )
    async latestCompleteValues(
        @Args() args: AnalyticsQueryArgs,
    ): Promise<HistoricDataModel[]> {
        return this.analyticsAWSGetter.getLatestCompleteValues(
            args.series,
            args.metric,
            args.start,
            args.time,
        );
    }

    @Query(() => [HistoricDataModel])
    @UsePipes(
        new ValidationPipe({
            skipNullProperties: true,
            skipMissingProperties: true,
            skipUndefinedProperties: true,
        }),
    )
    async sumCompleteValues(
        @Args() args: AnalyticsQueryArgs,
    ): Promise<HistoricDataModel[]> {
        return this.analyticsAWSGetter.getSumCompleteValues(
            args.series,
            args.metric,
            args.start,
            args.time,
        );
    }

    @Query(() => [HistoricDataModel])
    @UsePipes(
        new ValidationPipe({
            skipNullProperties: true,
            skipMissingProperties: true,
            skipUndefinedProperties: true,
        }),
    )
    async values24h(
        @Args() args: AnalyticsQueryArgs,
    ): Promise<HistoricDataModel[]> {
        return this.analyticsAWSGetter.getValues24h(args.series, args.metric);
    }

    @Query(() => [HistoricDataModel])
    @UsePipes(
        new ValidationPipe({
            skipNullProperties: true,
            skipMissingProperties: true,
            skipUndefinedProperties: true,
        }),
    )
    async values24hSum(
        @Args() args: AnalyticsQueryArgs,
    ): Promise<HistoricDataModel[]> {
        return this.analyticsAWSGetter.getValues24hSum(
            args.series,
            args.metric,
        );
    }

    @Query(() => [HistoricDataModel], {
        deprecationReason: 'New optimized query will be available soon.',
    })
    @UsePipes(
        new ValidationPipe({
            skipNullProperties: true,
            skipMissingProperties: true,
            skipUndefinedProperties: true,
        }),
    )
    async latestHistoricData(
        @Args() args: AnalyticsQueryArgs,
    ): Promise<HistoricDataModel[]> {
        return [];
    }

    @Query(() => [HistoricDataModel], {
        deprecationReason: 'New optimized query will be available soon.',
    })
    @UsePipes(
        new ValidationPipe({
            skipNullProperties: true,
            skipMissingProperties: true,
            skipUndefinedProperties: true,
        }),
    )
    async latestBinnedHistoricData(
        @Args() args: AnalyticsQueryArgs,
    ): Promise<HistoricDataModel[]> {
        return [];
    }

    @Query(() => [CandleDataModel], {
        deprecationReason: 'Use tokenMiniChartPriceCandles instead',
    })
    @UsePipes(
        new ValidationPipe({
            skipNullProperties: true,
            skipMissingProperties: true,
            skipUndefinedProperties: true,
        }),
    )
    async priceCandles(
        @Args(PriceCandlesArgsValidationPipe)
        args: PriceCandlesQueryArgs,
    ): Promise<CandleDataModel[]> {
        const adjustedStart = alignTimestampTo4HourInterval(args.start);
        const adjustedEnd = alignTimestampTo4HourInterval(args.end);

        return this.analyticsPairService.tokenMiniChartPriceCandles(
            args.series,
            adjustedStart,
            adjustedEnd,
        );
    }

    @Query(() => [CandleDataModel])
    @UsePipes(new QueryArgsValidationPipe())
    async tokenMiniChartPriceCandles(
        @Args(PriceCandlesArgsValidationPipe)
        args: TokenMiniChartPriceCandlesQueryArgs,
    ): Promise<CandleDataModel[]> {
        const adjustedStart = alignTimestampTo4HourInterval(args.start);
        const adjustedEnd = alignTimestampTo4HourInterval(args.end);

        return this.analyticsPairService.tokenMiniChartPriceCandles(
            args.series,
            adjustedStart,
            adjustedEnd,
        );
    }

    @Query(() => [TradingActivityModel])
    async tradingActivity(
        @Args('series') series: string,
    ): Promise<TradingActivityModel[]> {
        const pairsMetadata = await this.routerAbi.pairsMetadata();

        for (const pair of pairsMetadata) {
            if (pair.firstTokenID === series || pair.secondTokenID === series) {
                return this.analyticsCompute.tokenTradingActivity(series);
            }
            if (pair.address === series) {
                return this.analyticsCompute.pairTradingActivity(series);
            }
        }

        throw new Error('Invalid parameters');
    }
}
