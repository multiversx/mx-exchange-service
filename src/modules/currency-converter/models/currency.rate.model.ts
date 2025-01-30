import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class CurrencyRateModel {
    @Field()
    currency: string;

    @Field()
    rate: number;
}
