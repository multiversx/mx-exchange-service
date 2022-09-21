import { UsePipes, ValidationPipe } from '@nestjs/common';
import { Int, Query } from '@nestjs/graphql';
import { Args, Resolver } from '@nestjs/graphql';
import { HistoricDataModel } from 'src/modules/analytics/models/analytics.model';
import { AWSQueryArgs, TimescaleQueryArgs } from './models/query.args';
import { AnalyticsGetterService } from './services/analytics.getter.service';
import { AnalyticsAWSGetterService } from './services/analytics.aws.getter.service';
import { ApolloError } from 'apollo-server-express';
import { AnalyticsTimescaleGetterService } from './services/analytics.timescale.getter.service';

@Resolver()
export class AnalyticsResolver {
    constructor(
        private readonly analyticsAWSGetter: AnalyticsAWSGetterService,
        private readonly analyticsTimescaleGetter: AnalyticsTimescaleGetterService,
        private readonly analyticsGetter: AnalyticsGetterService,
    ) {}

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
        @Args({ nullable: true }) args: AWSQueryArgs,
        @Args({ nullable: true }) timescaleArgs: TimescaleQueryArgs,
    ): Promise<HistoricDataModel[]> {
        if (args) {
            return await this.genericQuery(() =>
                this.analyticsAWSGetter.getLatestCompleteValues(
                    args.series,
                    args.metric,
                ),
            );
        } else if (timescaleArgs) {
            return await this.genericQuery(() =>
                this.analyticsTimescaleGetter.getLatestCompleteValues(
                    timescaleArgs.series,
                    timescaleArgs.key,
                ),
            );
        }
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
        @Args({ nullable: true }) args: AWSQueryArgs,
        @Args({ nullable: true }) timescaleArgs: TimescaleQueryArgs,
    ): Promise<HistoricDataModel[]> {
        if (args) {
            return await this.genericQuery(() =>
                this.analyticsAWSGetter.getSumCompleteValues(
                    args.series,
                    args.metric,
                ),
            );
        } else if (timescaleArgs) {
            return await this.genericQuery(() =>
                this.analyticsTimescaleGetter.getSumCompleteValues(
                    timescaleArgs.series,
                    timescaleArgs.key,
                ),
            );
        }
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
        @Args({ nullable: true }) args: AWSQueryArgs,
        @Args({ nullable: true }) timescaleArgs: TimescaleQueryArgs,
    ): Promise<HistoricDataModel[]> {
        if (args) {
            return await this.genericQuery(() =>
                this.analyticsAWSGetter.getValues24h(args.series, args.metric),
            );
        } else if (timescaleArgs) {
            return await this.genericQuery(() =>
                this.analyticsTimescaleGetter.getValues24h(
                    timescaleArgs.series,
                    timescaleArgs.key,
                ),
            );
        }
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
        @Args({ nullable: true }) args: AWSQueryArgs,
        @Args({ nullable: true }) timescaleArgs: TimescaleQueryArgs,
    ): Promise<HistoricDataModel[]> {
        if (args) {
            return await this.genericQuery(() =>
                this.analyticsAWSGetter.getValues24hSum(
                    args.series,
                    args.metric,
                ),
            );
        } else if (timescaleArgs) {
            return await this.genericQuery(() =>
                this.analyticsTimescaleGetter.getValues24hSum(
                    timescaleArgs.series,
                    timescaleArgs.key,
                ),
            );
        }
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
        @Args({ nullable: true }) args: AWSQueryArgs,
        @Args({ nullable: true }) timescaleArgs: TimescaleQueryArgs,
    ): Promise<HistoricDataModel[]> {
        if (args) {
            return await this.genericQuery(() =>
                this.analyticsAWSGetter.getLatestHistoricData(
                    args.time,
                    args.series,
                    args.metric,
                    args.start,
                ),
            );
        } else if (timescaleArgs) {
            return await this.genericQuery(() =>
                this.analyticsTimescaleGetter.getLatestHistoricData(
                    timescaleArgs.series,
                    timescaleArgs.key,
                    timescaleArgs.startDate,
                    timescaleArgs.endDate,
                ),
            );
        }
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
        @Args({ nullable: true }) args: AWSQueryArgs,
        @Args({ nullable: true }) timescaleArgs: TimescaleQueryArgs,
    ): Promise<HistoricDataModel[]> {
        if (args) {
            return await this.genericQuery(() =>
                this.analyticsAWSGetter.getLatestBinnedHistoricData(
                    args.time,
                    args.series,
                    args.metric,
                    args.bin,
                    args.start,
                ),
            );
        } else if (timescaleArgs) {
            return await this.genericQuery(() =>
                this.analyticsTimescaleGetter.getLatestBinnedHistoricData(
                    timescaleArgs.series,
                    timescaleArgs.key,
                    timescaleArgs.startDate,
                    timescaleArgs.resolution,
                ),
            );
        }
    }
}
