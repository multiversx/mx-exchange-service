import { UsePipes, ValidationPipe } from '@nestjs/common';
import { Int, Query } from '@nestjs/graphql';
import { Args, Resolver } from '@nestjs/graphql';
import { HistoricDataModel } from 'src/modules/analytics/models/analytics.model';
import { AnalyticsQueryArgs } from './models/query.args';
import { AnalyticsGetterService } from './services/analytics.getter.service';
import { ApolloError } from 'apollo-server-express';

@Resolver()
export class AnalyticsResolver {
    constructor(private readonly analyticsGetter: AnalyticsGetterService) {}

    private async genericQuery<T>(queryResolver: () => Promise<T>): Promise<T> {
        try {
            return await queryResolver();
        } catch (error) {
            throw new ApolloError(error);
        }
    }

    @Query(() => String)
    async getTokenPriceUSD(@Args('tokenID') tokenID: string): Promise<string> {
        return await this.genericQuery(() =>
            this.analyticsGetter.getTokenPriceUSD(tokenID),
        );
    }

    @Query(() => String)
    async totalValueLockedUSD(): Promise<string> {
        return await this.genericQuery(() =>
            this.analyticsGetter.getTotalValueLockedUSD(),
        );
    }

    @Query(() => String)
    async totalLockedValueUSDFarms(): Promise<string> {
        return await this.genericQuery(() =>
            this.analyticsGetter.getLockedValueUSDFarms(),
        );
    }

    @Query(() => String)
    async totalTokenSupply(@Args('tokenID') tokenID: string): Promise<string> {
        return await this.genericQuery(() =>
            this.analyticsGetter.getTotalTokenSupply(tokenID),
        );
    }

    @Query(() => String)
    async totalAggregatedRewards(
        @Args('days', { type: () => Int }) days: number,
    ) {
        return await this.genericQuery(() =>
            this.analyticsGetter.getTotalAggregatedRewards(days),
        );
    }

    @Query(() => String)
    async getFeeTokenBurned(
        @Args('tokenID') tokenID: string,
        @Args('time') time: string,
    ) {
        return await this.genericQuery(() =>
            this.analyticsGetter.getFeeTokenBurned(tokenID, time),
        );
    }

    @Query(() => String)
    async getPenaltyTokenBurned(
        @Args('tokenID') tokenID: string,
        @Args('time') time: string,
    ) {
        return await this.genericQuery(() =>
            this.analyticsGetter.getPenaltyTokenBurned(tokenID, time),
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
    async latestCompleteValues(
        @Args({ nullable: true }) args: AnalyticsQueryArgs,
    ): Promise<HistoricDataModel[]> {
        return await this.genericQuery(() =>
            this.analyticsGetter.getLatestCompleteValues(
                args.series,
                args.metric,
            ),
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
        return await this.genericQuery(() =>
            this.analyticsGetter.getSumCompleteValues(args.series, args.metric),
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
        return await this.genericQuery(() =>
            this.analyticsGetter.getValues24h(args.series, args.metric),
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
    async values24hSum(
        @Args() args: AnalyticsQueryArgs,
    ): Promise<HistoricDataModel[]> {
        return await this.genericQuery(() =>
            this.analyticsGetter.getValues24hSum(args.series, args.metric),
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
    async latestHistoricData(
        @Args() args: AnalyticsQueryArgs,
    ): Promise<HistoricDataModel[]> {
        return await this.genericQuery(() =>
            this.analyticsGetter.getLatestHistoricData(args),
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
    async latestBinnedHistoricData(
        @Args() args: AnalyticsQueryArgs,
    ): Promise<HistoricDataModel[]> {
        return await this.genericQuery(() =>
            this.analyticsGetter.getLatestBinnedHistoricData(args),
        );
    }
}
