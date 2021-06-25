import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class PairTradingModel {
    @Field()
    pairAddress: string;
    @Field()
    volumesUSD: string;
    @Field()
    feesUSD: string;
}

@ObjectType()
export class FactoryTradingModel {
    @Field()
    totalVolumesUSD: string;
    @Field()
    totalFeesUSD: string;
}

@ObjectType()
export class TradingInfoModel {
    @Field(type => FactoryTradingModel)
    factory: FactoryTradingModel;
    @Field(type => [PairTradingModel])
    pairs: PairTradingModel[];
}

@ObjectType()
export class AnalyticsModel {}
