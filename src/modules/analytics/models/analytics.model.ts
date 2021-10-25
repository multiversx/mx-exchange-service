import { Field, ObjectType } from '@nestjs/graphql';

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
export class FactoryAnalyticsModel {
    @Field()
    totalVolumesUSD: string;
    @Field()
    totalFeesUSD: string;
    @Field()
    totalValueLockedUSD: string;

    constructor(init?: Partial<FactoryAnalyticsModel>) {
        Object.assign(this, init);
    }
}

@ObjectType()
export class PairAnalyticsModel {
    @Field()
    firstTokenLocked: string;
    @Field()
    firstTokenLockedValueUSD: string;
    @Field()
    secondTokenLocked: string;
    @Field()
    secondTokenLockedValueUSD: string;
    @Field()
    lockedValueUSD: string;
    @Field()
    liquidity: string;
    @Field()
    firstTokenVolume: string;
    @Field()
    secondTokenVolume: string;
    @Field()
    volumeUSD: string;
    @Field()
    feesUSD: string;

    constructor(init?: Partial<PairAnalyticsModel>) {
        Object.assign(this, init);
    }
}

@ObjectType()
export class TokenAnalyticsModel {
    @Field()
    tokenID: string;
    @Field()
    priceUSD: string;
    @Field()
    volume: string;
    @Field()
    volumeUSD: string;
    @Field()
    feesUSD: string;
    @Field()
    valueLocked: string;
    @Field()
    valueLockedUSD: string;

    constructor(init?: Partial<TokenAnalyticsModel>) {
        Object.assign(this, init);
    }
}

@ObjectType()
export class AnalyticsModel {
    @Field(type => FactoryAnalyticsModel)
    factory: FactoryAnalyticsModel;
    @Field(type => [PairAnalyticsModel])
    pairs: PairAnalyticsModel[];
    @Field(type => [TokenAnalyticsModel])
    tokens: TokenAnalyticsModel[];

    constructor(init?: Partial<AnalyticsModel>) {
        Object.assign(this, init);
    }
}
