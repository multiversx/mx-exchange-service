import { ArgsType, Field, registerEnumType } from '@nestjs/graphql';
import {
    IsValidPDBucket,
    IsValidPDMetric,
} from '../validators/pd.args.validator';

export enum PDMetricsBuckets {
    MINUTE_1 = '1 minute',
    MINUTES_5 = '5 minutes',
    MINUTES_30 = '30 minutes',
    HOUR_1 = '1 hour',
}

registerEnumType(PDMetricsBuckets, { name: 'PDMetricsBuckets' });

@ArgsType()
export class PDAnalyticsArgs {
    @Field()
    priceDiscoveryAddress: string;
    @Field()
    @IsValidPDMetric()
    metric: string;
    @Field(() => PDMetricsBuckets)
    @IsValidPDBucket()
    bucket: PDMetricsBuckets;
}
