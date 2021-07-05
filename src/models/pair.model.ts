import { ObjectType, Field, ArgsType } from '@nestjs/graphql';
import { PaginationArgs } from '../modules/dex.model';
import { EsdtToken } from './tokens/esdtToken.model';
import { PairInfoModel } from './pair-info.model';

@ArgsType()
export class GetPairsArgs extends PaginationArgs {}

@ObjectType()
export class LiquidityPosition {
    @Field()
    firstTokenAmount: string;

    @Field()
    secondTokenAmount: string;
}

@ObjectType()
export class PairModel {
    @Field()
    address: string;

    @Field()
    firstToken: EsdtToken;

    @Field()
    secondToken: EsdtToken;

    @Field()
    firstTokenPrice: string;

    @Field()
    firstTokenPriceUSD: string;

    @Field()
    secondTokenPrice: string;

    @Field()
    secondTokenPriceUSD: string;

    @Field()
    liquidityPoolToken: EsdtToken;

    @Field()
    liquidityPoolTokenPriceUSD: string;

    @Field()
    info: PairInfoModel;

    @Field()
    state: string;
}

@ObjectType()
export class TemporaryFundsModel {
    @Field()
    pairAddress: string;
    @Field(type => EsdtToken, { nullable: true })
    firstToken?: EsdtToken;
    @Field({ nullable: true })
    firstAmount?: string;
    @Field(type => EsdtToken, { nullable: true })
    secondToken?: EsdtToken;
    @Field({ nullable: true })
    secondAmount?: string;
}
