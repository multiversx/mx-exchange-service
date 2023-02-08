import { ArgsType, Field, Int } from '@nestjs/graphql';
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
    @Field(() => Int, { nullable: true })
    @Matches(new RegExp('[1-60][s,m,h,d]'))
    bin: string;
}
