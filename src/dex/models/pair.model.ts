import { ObjectType, Field, ArgsType } from '@nestjs/graphql';
import { PaginationArgs } from '../dex.model';
import { PairInfoModel } from './pair-info.model';
import { PairPriceModel } from './pair-price.model';

@ArgsType()
export class GetPairsArgs extends PaginationArgs {
}

@ObjectType()
export class LiquidityPosition {
    @Field()
    firstToken: String;

    @Field()
    secondToken: String;
}

@ObjectType()
export class TokenModel {
    @Field()
    token: string;

    @Field()
    name: string;

    @Field()
    decimals: number;
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
    liquidityPoolToken: TokenModel;

    @Field()
    info: PairInfoModel;

    @Field()
    price: PairPriceModel;

    @Field()
    state: boolean;
}
