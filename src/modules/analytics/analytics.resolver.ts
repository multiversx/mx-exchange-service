import { Int, Query } from '@nestjs/graphql';
import { Args, Resolver } from '@nestjs/graphql';
import {
    AnalyticsModel,
    HistoricDataModel,
} from 'src/modules/analytics/models/analytics.model';
import { AnalyticsService } from './analytics.service';

@Resolver(of => AnalyticsModel)
export class AnalyticsResolver {
    constructor(private readonly analyticsService: AnalyticsService) {}

    @Query(returns => String)
    async getTokenPriceUSD(@Args('tokenID') tokenID: string): Promise<string> {
        return this.analyticsService.getTokenPriceUSD(tokenID);
    }

    @Query(returns => String)
    async totalValueLockedUSD(): Promise<string> {
        return this.analyticsService.getTotalValueLockedUSD();
    }

    @Query(returns => String)
    async totalLockedValueUSDFarms(): Promise<string> {
        return this.analyticsService.getLockedValueUSDFarms();
    }

    @Query(returns => String)
    async totalTokenSupply(@Args('tokenID') tokenID: string): Promise<string> {
        return this.analyticsService.getTotalTokenSupply(tokenID);
    }

    @Query(returns => String)
    async totalAgregatedRewards(
        @Args('days', { type: () => Int }) days: number,
    ) {
        return this.analyticsService.getTotalAgregatedRewards(days);
    }

    @Query(returns => [HistoricDataModel])
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
}
