import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
export class DexFactoryModel {
  @Field()
  address: string;

  @Field()
  pairCount: number;

  @Field()
  totalTxCount: number;

  @Field()
  totalVolume: number;

  @Field()
  totalLiquidity: number;
}

@ObjectType()
export class PairInfoModel {
  @Field()
  reserves_a: string;

  @Field()
  reserves_b: string;

  @Field()
  total_supply: string;

}

@ObjectType()
export class PairPriceModel {
  @Field()
  tokena_price: string;

  @Field()
  tokenb_price: string;
}

@ObjectType()
export class PairModel {
  @Field()
  token_a: string;

  @Field()
  token_b: string;

  @Field()
  address: string;

  @Field()
  info: PairInfoModel;

  @Field()
  price: PairPriceModel;

}

@ObjectType()
export class TransactionModel {
  @Field()
  nonce: number;
  @Field()
  value: string;
  @Field()
  sender: string;
  @Field()
  receiver: string;
  @Field()
  gasPrice: number;
  @Field()
  gasLimit: number;
  @Field()
  data: string;
  @Field()
  chainID: string;
  @Field()
  version: number;
  @Field()
  options: string;
  @Field()
  status: string;
}
