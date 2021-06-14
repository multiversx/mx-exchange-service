import { ObjectType, Field, ArgsType, Int } from '@nestjs/graphql';
import { PaginationArgs } from '../dex.model';
import { TokenModel } from './esdtToken.model';
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
    firstToken: TokenModel;

    @Field()
    secondToken: TokenModel;

    @Field()
    firstTokenPrice: string;

    @Field()
    firstTokenPriceUSD: string;

    @Field()
    secondTokenPrice: string;

    @Field()
    secondTokenPriceUSD: string;

    @Field()
    liquidityPoolToken: TokenModel;

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
    @Field(type => TokenModel, { nullable: true })
    firstToken?: TokenModel;
    @Field({ nullable: true })
    firstAmount?: string;
    @Field(type => TokenModel, { nullable: true })
    secondToken?: TokenModel;
    @Field({ nullable: true })
    secondAmount?: string;
}
