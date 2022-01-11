import { Field, ObjectType } from '@nestjs/graphql';
import { EsdtToken } from 'src/models/tokens/esdtToken.model';

@ObjectType()
export class HistoricDataModel {
    @Field()
    timestamp: string;
    @Field()
    value: string;

    constructor(init?: Partial<HistoricDataModel>) {
        Object.assign(this, init);
    }
}

@ObjectType()
export class PairDayDataModel {
    @Field()
    timestamp: string;

    @Field()
    address: string;

    @Field()
    firstToken: EsdtToken;

    @Field()
    secondToken: EsdtToken;

    @Field()
    lockedValueUSD: string;

    @Field()
    firstTokenPriceUSD: string;

    @Field()
    secondTokenPriceUSD: string;

    @Field()
    volumeUSD24h: string;

    @Field()
    feesUSD24h: string;

    constructor(init?: Partial<PairDayDataModel>) {
        Object.assign(this, init);
    }
}
