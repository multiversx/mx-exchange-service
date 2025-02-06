import { Field, ObjectType, registerEnumType } from '@nestjs/graphql';

export enum CurrencyRateType {
    'CRYPTO' = 'CRYPTO',
    'FIAT' = 'FIAT',
}

export enum CurrencyCategory {
    'CRYPTO' = 'CRYPTO',
    'FIAT' = 'FIAT',
    'ALL' = 'ALL',
}

registerEnumType(CurrencyCategory, { name: 'CurrencyCategory' });
@ObjectType()
export class CurrencyRateModel {
    @Field()
    symbol: string;

    @Field()
    rate: number;

    @Field()
    category: CurrencyRateType;

    @Field()
    name: string;
}
