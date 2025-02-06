import { Field, ObjectType } from '@nestjs/graphql';

export enum CurrencyRateType {
    'CRYPTO' = 'CRYPTO',
    'FIAT' = 'FIAT',
}

@ObjectType()
export class CurrencyRateModel {
    @Field()
    currency: string;

    @Field()
    rate: number;

    @Field()
    category: CurrencyRateType;

    @Field()
    name: string;
}
