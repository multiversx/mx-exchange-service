import { UsePipes, ValidationPipe } from '@nestjs/common';
import { Int, Query } from '@nestjs/graphql';
import { Args, Resolver } from '@nestjs/graphql';
import { CandleDataModel, HistoricDataModel } from 'src/modules/analytics/models/analytics.model';
import { AnalyticsQueryArgs, PriceCandlesQueryArgs } from './models/query.args';
import { AnalyticsAWSGetterService } from './services/analytics.aws.getter.service';
import { AnalyticsComputeService } from './services/analytics.compute.service';
import { PairComputeService } from '../pair/services/pair.compute.service';
import { TokenService } from '../tokens/services/token.service';
import { AnalyticsPairService } from './services/analytics.pair.service';

@Resolver()
export class AnalyticsResolver {
    constructor(
        private readonly analyticsAWSGetter: AnalyticsAWSGetterService,
        private readonly analyticsCompute: AnalyticsComputeService,
        private readonly tokenService: TokenService,
        private readonly pairCompute: PairComputeService,
        private readonly analyticsPairService: AnalyticsPairService,
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
        return (await this.tokenService.getTokenMetadata(tokenID)).supply;
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

    @Query(() => [CandleDataModel])
    async priceCandles(
        @Args() args: PriceCandlesQueryArgs,
    ): Promise<CandleDataModel[]> {
          return this.analyticsPairService.getPriceCandles(
              args.series,
              args.metric,
              args.startDate, 
              args.endDate, 
              args.resolution
          );
      }
}
