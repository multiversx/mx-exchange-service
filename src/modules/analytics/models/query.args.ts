import { ArgsType, Field, registerEnumType } from '@nestjs/graphql';
import { Matches } from 'class-validator';
import {
    addTimeToDateUtc,
    oneDay,
    oneHour,
    oneMinute,
} from 'src/helpers/helpers';
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
    @IsValidUnixTime()
    start: string;

    @Field({ nullable: true })
    @Matches(new RegExp('[1-9][s,m,h,d]'))
    time: string;

    @Field({ nullable: true })
    @Matches(new RegExp('[1-60][s,m,h,d]'))
    bin: string;

    public getResolution(): TimeResolutionType {
        switch (this.bin) {
            case '1m': {
                return TimeResolutionType.INTERVAL_1_MINUTE;
            }
            case '10m': {
                return TimeResolutionType.INTERVAL_10_MINUTES;
            }
            case '1h': {
                return TimeResolutionType.INTERVAL_HOUR;
            }
            case '1d': {
                return TimeResolutionType.INTERVAL_DAY;
            }
            case '7d': {
                return TimeResolutionType.INTERVAL_WEEK;
            }
        }

        throw new Error(
            `Can't convert bin '${this.bin}' to timescale resolution`,
        );
    }

    public getEndTime(): string {
        const timeMetric: string = this.time.slice(this.time.length - 1);
        const timeMultiplier: number = parseInt(
            this.time.replace(timeMetric, ''),
        );

        switch (timeMetric) {
            case 's': {
                return addTimeToDateUtc(this.start, timeMultiplier);
            }
            case 'm': {
                return addTimeToDateUtc(
                    this.start,
                    timeMultiplier * oneMinute(),
                );
            }
            case 'h': {
                return addTimeToDateUtc(this.start, timeMultiplier * oneHour());
            }
            case 'd': {
                return addTimeToDateUtc(this.start, timeMultiplier * oneDay());
            }
        }
    }
}

export enum TimeResolutionType {
    INTERVAL_1_MINUTE = 'INTERVAL_1_MINUTE',
    INTERVAL_10_MINUTES = 'INTERVAL_10_MINUTES',
    INTERVAL_HOUR = 'INTERVAL_HOUR',
    INTERVAL_DAY = 'INTERVAL_DAY',
    INTERVAL_WEEK = 'INTERVAL_WEEK',
}
registerEnumType(TimeResolutionType, { name: 'TimeResolutionType' });
