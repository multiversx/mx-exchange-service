import { ArgsType, Field } from '@nestjs/graphql';

@ArgsType()
export class AnalyticsArgs {
    @Field()
    name: string;
    @Field()
    value: string;
}
