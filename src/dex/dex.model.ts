import { ObjectType, Field, ArgsType, Int } from '@nestjs/graphql';

@ArgsType()
export class PaginationArgs {
  @Field((type) => Int)
  offset: number = 0;

  @Field((type) => Int)
  limit: number = 10;
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
  @Field({ nullable: true })
  options?: string;
  @Field({ nullable: true })
  status?: string;
  @Field({ nullable: true })
  signature?: string;
}
