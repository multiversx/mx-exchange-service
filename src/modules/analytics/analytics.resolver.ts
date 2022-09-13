import { UsePipes, ValidationPipe } from '@nestjs/common';
import { Int, Query } from '@nestjs/graphql';
import { Args, Resolver } from '@nestjs/graphql';
import { HistoricDataModel } from 'src/modules/analytics/models/analytics.model';
import { AWSQueryArgs } from './models/query.args';
import { AnalyticsGetterService } from './services/analytics.getter.service';
import { AnalyticsAWSGetterService } from './services/analytics.aws.getter.service';

@Resolver()
export class AnalyticsResolver {
    constructor(
        private readonly analyticsAWSGetter: AnalyticsAWSGetterService,
        private readonly analyticsGetter: AnalyticsGetterService,
    ) {}

    @Query(() => String)
    async getTokenPriceUSD(@Args('tokenID') tokenID: string): Promise<string> {
        return this.analyticsGetter.getTokenPriceUSD(tokenID);
    }

    @Query(() => String)
    async totalValueLockedUSD(): Promise<string> {
        return this.analyticsGetter.getTotalValueLockedUSD();
    }

    @Query(() => String)
    async totalLockedValueUSDFarms(): Promise<string> {
        return this.analyticsGetter.getLockedValueUSDFarms();
    }

    @Query(() => String)
    async totalTokenSupply(@Args('tokenID') tokenID: string): Promise<string> {
        return this.analyticsGetter.getTotalTokenSupply(tokenID);
    }

    @Query(() => String)
    async totalAggregatedRewards(
        @Args('days', { type: () => Int }) days: number,
    ) {
        return this.analyticsGetter.getTotalAggregatedRewards(days);
    }

    @Query(() => String)
    async getFeeTokenBurned(
        @Args('tokenID') tokenID: string,
        @Args('time') time: string,
    ) {
        return await this.analyticsGetter.getFeeTokenBurned(tokenID, time);
    }

    @Query(() => String)
    async getPenaltyTokenBurned(
        @Args('tokenID') tokenID: string,
        @Args('time') time: string,
    ) {
        return await this.analyticsGetter.getPenaltyTokenBurned(tokenID, time);
    }

    @Query(() => [HistoricDataModel])
    @UsePipes(
        new ValidationPipe({
            skipNullProperties: true,
            skipMissingProperties: true,
            skipUndefinedProperties: true,
        }),
    )
    async historicData(
        @Args() args: AWSQueryArgs,
    ): Promise<HistoricDataModel[]> {
        return await this.analyticsAWSGetter.getHistoricData(
            args.series,
            args.metric,
            args.time,
        );
    }

    @Query(() => String)
    @UsePipes(
        new ValidationPipe({
            skipNullProperties: true,
            skipMissingProperties: true,
            skipUndefinedProperties: true,
        }),
    )
    async closingValue(@Args() args: AWSQueryArgs): Promise<string> {
        return await this.analyticsAWSGetter.getClosingValue(
            args.series,
            args.metric,
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
    async completeValues(
        @Args() args: AWSQueryArgs,
    ): Promise<HistoricDataModel[]> {
        return await this.analyticsAWSGetter.getCompleteValues(
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
    async latestCompleteValues(
        @Args() args: AWSQueryArgs,
    ): Promise<HistoricDataModel[]> {
        return await this.analyticsAWSGetter.getLatestCompleteValues(
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
    async sumCompleteValues(
        @Args() args: AWSQueryArgs,
    ): Promise<HistoricDataModel[]> {
        return await this.analyticsAWSGetter.getSumCompleteValues(
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
    async latestValues(
        @Args() args: AWSQueryArgs,
    ): Promise<HistoricDataModel[]> {
        return await this.analyticsAWSGetter.getLatestValues(
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
    async marketValues(
        @Args() args: AWSQueryArgs,
    ): Promise<HistoricDataModel[]> {
        return await this.analyticsAWSGetter.getMarketValues(
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
    async marketCompleteValues(
        @Args() args: AWSQueryArgs,
    ): Promise<HistoricDataModel[]> {
        return await this.analyticsAWSGetter.getMarketCompleteValues(
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
    async values24h(@Args() args: AWSQueryArgs): Promise<HistoricDataModel[]> {
        return await this.analyticsAWSGetter.getValues24h(
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
    async values24hSum(
        @Args() args: AWSQueryArgs,
    ): Promise<HistoricDataModel[]> {
        return await this.analyticsAWSGetter.getValues24hSum(
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
    async latestHistoricData(
        @Args() args: AWSQueryArgs,
    ): Promise<HistoricDataModel[]> {
        return await this.analyticsAWSGetter.getLatestHistoricData(
            args.time,
            args.series,
            args.metric,
            args.start,
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
        @Args() args: AWSQueryArgs,
    ): Promise<HistoricDataModel[]> {
        return await this.analyticsAWSGetter.getLatestBinnedHistoricData(
            args.time,
            args.series,
            args.metric,
            args.bin,
            args.start,
        );
    }
}
