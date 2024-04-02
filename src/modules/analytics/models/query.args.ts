import { ArgsType, Field, registerEnumType } from '@nestjs/graphql';
import { Matches } from 'class-validator';
import { IsValidMetric } from 'src/helpers/validators/metric.validator';
import { IsValidSeries } from 'src/helpers/validators/series.validator';
import { IsValidUnixTime } from 'src/helpers/validators/unix.time.validator';

@ArgsType()
export class AnalyticsQueryArgs {
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

export enum PairCandlesResolutions {
    MINUTE_1 = '1 minute',
    MINUTE_5 = '5 minutes',
    MINUTE_15 = '15 minutes',
    MINUTE_30 = '30 minutes',
    HOUR_1 = '1 hour',
    HOUR_4 = '4 hours',
    DAY_1 = '1 day',
    DAY_7 = '7 days',
    MONTH_1 = '1 month'
}

registerEnumType(PairCandlesResolutions, { name: 'PairCandlesResolutions' })

@ArgsType()
export class PairsCandlesQueryArgs {
    @Field()
    pairAddress: string;
    @Field()
    startDate: string;
    @Field({ nullable: true })
    endDate: string;
    @Field(() => PairCandlesResolutions)  // todo add validation
    resolution: PairCandlesResolutions;
}