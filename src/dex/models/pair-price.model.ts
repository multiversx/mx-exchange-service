import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
export class PairPriceModel {
    @Field()
    firstToken: string;

    @Field()
    secondToken: string;
}
