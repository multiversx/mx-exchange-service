import { ArgsType, Field } from '@nestjs/graphql';
import { Matches } from 'class-validator';
import { IsValidMetric } from 'src/helpers/validators/metric.validator';
import { IsValidSeries } from 'src/helpers/validators/series.validator';
import { IsValidUnixTime } from 'src/helpers/validators/unix.time.validator';

@ArgsType()
export class AWSQueryArgs {
    @Field()
    @IsValidSeries()
    series: string;
    @Field()
    @IsValidMetric()
    metric: string;
    @Field({ nullable: true })
    @Matches(new RegExp('[1-9][s,m,h,d]'))
    time: string;
    @Field({ nullable: true })
    @IsValidUnixTime()
    start: string;
    @Field({ nullable: true })
    @Matches(new RegExp('[1-60][s,m,h,d]'))
    bin: string;
}

@ArgsType()
export class TimescaleQueryArgs {
    @Field()
    @IsValidSeries()
    series: string;
    @Field()
    key: string;
    @Field({ nullable: true })
    startDate: string;
    @Field({ nullable: true })
    endDate: string;
    @Field(() => TimeResolutionType, { nullable: true })
    resolution: TimeResolutionType;
}

export enum TimeResolutionType {
    INTERVAL_1_MINUTE = 'INTERVAL_1_MINUTE',
    INTERVAL_10_MINUTES = 'INTERVAL_10_MINUTES',
    INTERVAL_HOUR = 'INTERVAL_HOUR',
    INTERVAL_DAY = 'INTERVAL_DAY',
    INTERVAL_WEEK = 'INTERVAL_WEEK',
}
