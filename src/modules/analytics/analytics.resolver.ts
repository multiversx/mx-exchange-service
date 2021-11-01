import { Int, Query } from '@nestjs/graphql';
import { Args, Resolver } from '@nestjs/graphql';
import {
    AnalyticsModel,
    HistoricDataModel,
} from 'src/modules/analytics/models/analytics.model';
import { AnalyticsService } from './analytics.service';
import { awsConfig } from '../../config';

@Resolver(() => AnalyticsModel)
export class AnalyticsResolver {
    constructor(private readonly analyticsService: AnalyticsService) {}

    @Query(() => String)
    async getTokenPriceUSD(@Args('tokenID') tokenID: string): Promise<string> {
        return this.analyticsService.getTokenPriceUSD(tokenID);
    }

    @Query(() => String)
    async totalValueLockedUSD(): Promise<string> {
        return this.analyticsService.getTotalValueLockedUSD();
    }

    @Query(() => String)
    async totalLockedValueUSDFarms(): Promise<string> {
        return this.analyticsService.getLockedValueUSDFarms();
    }

    @Query(() => String)
    async totalTokenSupply(@Args('tokenID') tokenID: string): Promise<string> {
        return this.analyticsService.getTotalTokenSupply(tokenID);
    }

    @Query(() => String)
    async totalAgregatedRewards(
        @Args('days', { type: () => Int }) days: number,
    ) {
        return this.analyticsService.getTotalAgregatedRewards(days);
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
}
