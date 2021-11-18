import { Int, Query } from '@nestjs/graphql';
import { Args, Resolver } from '@nestjs/graphql';
import {
    AnalyticsModel,
    HistoricDataModel,
} from 'src/modules/analytics/models/analytics.model';
import { AnalyticsGetterService } from './services/analytics.getter.service';
import { AnalyticsService } from './services/analytics.service';

@Resolver(() => AnalyticsModel)
export class AnalyticsResolver {
    constructor(
        private readonly analyticsService: AnalyticsService,
        private readonly analyticsGetterService: AnalyticsGetterService,
    ) {}

    @Query(() => String)
    async getTokenPriceUSD(@Args('tokenID') tokenID: string): Promise<string> {
        return this.analyticsGetterService.getTokenPriceUSD(tokenID);
    }

    @Query(() => String)
    async totalValueLockedUSD(): Promise<string> {
        return this.analyticsGetterService.getTotalValueLockedUSD();
    }

    @Query(() => String)
    async totalLockedValueUSDFarms(): Promise<string> {
        return this.analyticsGetterService.getLockedValueUSDFarms();
    }

    @Query(() => String)
    async totalTokenSupply(@Args('tokenID') tokenID: string): Promise<string> {
        return this.analyticsGetterService.getTotalTokenSupply(tokenID);
    }

    @Query(() => String)
    async totalAggregatedRewards(
        @Args('days', { type: () => Int }) days: number,
    ) {
        return this.analyticsGetterService.getTotalAggregatedRewards(days);
    }

    @Query(() => [HistoricDataModel])
    async historicData(
        @Args('series') series: string,
        @Args('metric') metric: string,
        @Args('time') time: string,
    ): Promise<HistoricDataModel[]> {
        return await this.analyticsService.getHistoricData(
            series,
            metric,
            time,
        );
    }

    @Query(() => String)
    async closingValue(
        @Args('series') series: string,
        @Args('metric') metric: string,
        @Args('time') time: string,
    ): Promise<string> {
        return await this.analyticsService.getClosingValue(
            series,
            metric,
            time,
        );
    }

    @Query(() => [HistoricDataModel])
    async completeValues(
        @Args('series') series: string,
        @Args('metric') metric: string,
    ): Promise<HistoricDataModel[]> {
        return await this.analyticsService.getCompleteValues(series, metric);
    }

    @Query(() => [HistoricDataModel])
    async latestCompleteValues(
        @Args('series') series: string,
        @Args('metric') metric: string,
    ): Promise<HistoricDataModel[]> {
        return await this.analyticsService.getLatestCompleteValues(
            series,
            metric,
        );
    }

    @Query(() => [HistoricDataModel])
    async sumCompleteValues(
        @Args('series') series: string,
        @Args('metric') metric: string,
    ): Promise<HistoricDataModel[]> {
        return await this.analyticsService.getSumCompleteValues(series, metric);
    }

    @Query(() => [HistoricDataModel])
    async latestValues(
        @Args('series') series: string,
        @Args('metric') metric: string,
    ): Promise<HistoricDataModel[]> {
        return await this.analyticsService.getLatestValues(series, metric);
    }

    @Query(() => [HistoricDataModel])
    async marketValues(
        @Args('series') series: string,
        @Args('metric') metric: string,
    ): Promise<HistoricDataModel[]> {
        return await this.analyticsService.getMarketValues(series, metric);
    }

    @Query(() => [HistoricDataModel])
    async marketCompleteValues(
        @Args('series') series: string,
        @Args('metric') metric: string,
    ): Promise<HistoricDataModel[]> {
        return await this.analyticsService.getMarketCompleteValues(
            series,
            metric,
        );
    }

    @Query(() => [HistoricDataModel])
    async values24h(
        @Args('series') series: string,
        @Args('metric') metric: string,
    ): Promise<HistoricDataModel[]> {
        return await this.analyticsService.getValues24h(series, metric);
    }

    @Query(() => [HistoricDataModel])
    async values24hSum(
        @Args('series') series: string,
        @Args('metric') metric: string,
    ): Promise<HistoricDataModel[]> {
        return await this.analyticsService.getValues24hSum(series, metric);
    }
}
